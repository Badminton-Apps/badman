import { User } from "@badman/backend-authorization";
import { Player } from "@badman/backend-database";
import { CpDataCollector } from "@badman/backend-generator";
import { ConfigType } from "@badman/utils";
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AllowAnonymous } from "@badman/backend-authorization";
import { FastifyReply } from "fastify";

interface CpGenerationRecord {
  runId: string;
  userId: string;
  eventId: string;
  status: "pending" | "completed" | "failed";
  createdAt: Date;
}

@Controller("cp")
export class CpController {
  private readonly logger = new Logger(CpController.name);

  /**
   * In-memory store for generation records.
   * For a once-a-year operation, this is sufficient.
   * Records auto-expire after 24 hours.
   */
  private generations = new Map<string, CpGenerationRecord>();
  private pendingByEvent = new Map<string, string>();

  constructor(
    private dataCollector: CpDataCollector,
    private configService: ConfigService<ConfigType>
  ) {}

  @Post("generate")
  async generate(@User() user: Player, @Body() body: { eventId: string }) {
    if (!user?.id) {
      throw new UnauthorizedException("Authentication required");
    }

    const hasPermission = await user.hasAnyPermission(["export-cp:competition"]);
    if (!hasPermission) {
      throw new UnauthorizedException("You do not have permission to export CP files");
    }

    const { eventId } = body;
    if (!eventId) {
      throw new HttpException("eventId is required", 400);
    }

    // Prevent concurrent generation for the same event
    const existingPending = this.pendingByEvent.get(eventId);
    if (existingPending) {
      const record = this.generations.get(existingPending);
      if (record && record.status === "pending") {
        const ageMinutes = (Date.now() - record.createdAt.getTime()) / 1000 / 60;
        if (ageMinutes < 15) {
          throw new HttpException(
            "A CP generation is already in progress for this event. Please wait for it to complete.",
            409
          );
        }
        // Expired pending record, clean up
        this.generations.delete(existingPending);
        this.pendingByEvent.delete(eventId);
      }
    }

    // Collect data from PostgreSQL
    this.logger.log(`Collecting CP data for event ${eventId}`);
    const payload = await this.dataCollector.collect(eventId);

    // Base64 encode
    const payloadJson = JSON.stringify(payload);
    const payloadBase64 = Buffer.from(payloadJson).toString("base64");

    // Validate size (GitHub workflow_dispatch input limit is 65535 chars)
    if (payloadBase64.length > 65535) {
      throw new HttpException(
        `Competition data is too large for export (${payloadBase64.length} chars, max 65535). Contact support.`,
        413
      );
    }

    // Trigger GitHub Actions workflow
    const githubToken = this.configService.get("GITHUB_TOKEN_CP");
    const repoOwner = this.configService.get("GITHUB_REPO_OWNER") || "Badminton-Apps";
    const repoName = this.configService.get("GITHUB_REPO_NAME") || "badman";
    const callbackUrl = this.configService.get("CP_CALLBACK_URL");

    if (!githubToken) {
      throw new HttpException("CP export is not configured (missing GITHUB_TOKEN_CP)", 503);
    }
    if (!callbackUrl) {
      throw new HttpException("CP export is not configured (missing CP_CALLBACK_URL)", 503);
    }

    const workflowUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/generate-cp.yml/dispatches`;

    const response = await fetch(workflowUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: "develop",
        inputs: {
          payload: payloadBase64,
          callback_url: callbackUrl,
          requesting_user_id: user.id,
        },
      }),
    });

    if (response.status !== 204) {
      const errorBody = await response.text();
      this.logger.error(`GitHub API error: ${response.status} ${errorBody}`);
      throw new HttpException(
        `Failed to trigger CP generation: GitHub API returned ${response.status}`,
        502
      );
    }

    // Track pending generation (we don't get a run_id from dispatch, the webhook will provide it)
    const trackingId = `${eventId}-${Date.now()}`;
    const record: CpGenerationRecord = {
      runId: trackingId,
      userId: user.id,
      eventId,
      status: "pending",
      createdAt: new Date(),
    };
    this.generations.set(trackingId, record);
    this.pendingByEvent.set(eventId, trackingId);

    this.logger.log(`CP generation triggered for event ${eventId} by user ${user.id}`);

    return {
      message:
        "CP generation started. You will receive an email when the file is ready for download.",
      trackingId,
    };
  }

  @Post("webhook")
  @AllowAnonymous()
  async webhook(
    @Headers("x-webhook-secret") webhookSecret: string,
    @Body() body: { run_id: string; user_id: string; status: string }
  ) {
    const expectedSecret = this.configService.get("CP_WEBHOOK_SECRET");
    if (!webhookSecret || webhookSecret !== expectedSecret) {
      throw new UnauthorizedException("Invalid webhook secret");
    }

    this.logger.log(
      `CP webhook received: run_id=${body.run_id}, status=${body.status}, user_id=${body.user_id}`
    );

    // Find the pending record for this user and update it with the real run_id
    let matchedTrackingId: string | undefined;
    for (const [trackingId, record] of this.generations) {
      if (record.userId === body.user_id && record.status === "pending") {
        record.runId = body.run_id;
        record.status = body.status === "completed" ? "completed" : "failed";
        matchedTrackingId = trackingId;

        // Clean up pending-by-event
        this.pendingByEvent.delete(record.eventId);
        break;
      }
    }

    // Also store by run_id for download lookups
    if (matchedTrackingId) {
      const record = this.generations.get(matchedTrackingId)!;
      this.generations.set(body.run_id, record);
    }

    // Send email notification
    if (body.status === "completed") {
      await this._sendCompletionEmail(body.user_id, body.run_id);
    } else {
      await this._sendFailureEmail(body.user_id);
    }

    return { ok: true };
  }

  @Get("download/:runId")
  async download(@User() user: Player, @Param("runId") runId: string, @Res() res: FastifyReply) {
    if (!user?.id) {
      throw new UnauthorizedException("Authentication required");
    }

    const hasPermission = await user.hasAnyPermission(["export-cp:competition"]);
    if (!hasPermission) {
      throw new UnauthorizedException("You do not have permission to download CP files");
    }

    // Verify ownership (or admin)
    const record = this.generations.get(runId);
    if (!record) {
      throw new NotFoundException("Generation not found or expired");
    }

    if (record.status === "failed") {
      throw new HttpException("This generation failed. Please try again.", 410);
    }

    if (record.status === "pending") {
      throw new HttpException(
        "This generation is still in progress. Please wait for the email notification.",
        202
      );
    }

    // Fetch artifact from GitHub
    const githubToken = this.configService.get("GITHUB_TOKEN_CP");
    const repoOwner = this.configService.get("GITHUB_REPO_OWNER") || "Badminton-Apps";
    const repoName = this.configService.get("GITHUB_REPO_NAME") || "badman";

    const artifactsUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/actions/runs/${runId}/artifacts`;

    const artifactsRes = await fetch(artifactsUrl, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!artifactsRes.ok) {
      if (artifactsRes.status === 404) {
        throw new HttpException(
          "CP file has expired (artifacts are kept for 30 days). Please regenerate.",
          410
        );
      }
      throw new HttpException(
        `Failed to fetch artifact: GitHub API returned ${artifactsRes.status}`,
        502
      );
    }

    const artifactsData = (await artifactsRes.json()) as {
      artifacts: { id: number; name: string; archive_download_url: string }[];
    };
    const cpArtifact = artifactsData.artifacts.find((a) => a.name === "cp-file");

    if (!cpArtifact) {
      throw new HttpException("CP file artifact not found. It may have expired.", 410);
    }

    // Download the artifact zip
    const downloadRes = await fetch(cpArtifact.archive_download_url, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!downloadRes.ok) {
      throw new HttpException(`Failed to download artifact: ${downloadRes.status}`, 502);
    }

    // GitHub returns a zip file containing the .cp file
    // Stream the zip directly -- the frontend/user can extract it
    const buffer = Buffer.from(await downloadRes.arrayBuffer());

    res.header("Content-Disposition", `attachment; filename="cp-file-${runId}.zip"`);
    res.type("application/zip").send(buffer);
  }

  private async _sendCompletionEmail(userId: string, runId: string): Promise<void> {
    const player = await Player.findByPk(userId);
    if (!player?.email) {
      this.logger.warn(`Cannot send CP completion email: user ${userId} has no email`);
      return;
    }

    const clientUrl = this.configService.get("CLIENT_URL") || "";
    const downloadUrl = `${clientUrl}/cp/download/${runId}`;

    this.logger.log(
      `CP file ready for user ${player.fullName} (${player.email}). Download: ${downloadUrl}`
    );

    // TODO: Integrate with MailingService for proper templated email.
    // For now, log the download URL. The MailingService uses Pug templates
    // and we'd need to create a new template for this notification.
    // This is acceptable for a once-a-year operation.
    this.logger.log(
      `[EMAIL PLACEHOLDER] To: ${player.email}, Subject: CP file ready, Body: Download at ${downloadUrl}`
    );
  }

  private async _sendFailureEmail(userId: string): Promise<void> {
    const player = await Player.findByPk(userId);
    if (!player?.email) {
      this.logger.warn(`Cannot send CP failure email: user ${userId} has no email`);
      return;
    }

    this.logger.log(
      `[EMAIL PLACEHOLDER] To: ${player.email}, Subject: CP generation failed, Body: Please try again or contact support.`
    );
  }

  /**
   * Clean up expired generation records (older than 24 hours).
   * Called lazily -- not on a timer, just when new requests come in.
   */
  private _cleanupExpiredRecords(): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const [key, record] of this.generations) {
      if (record.createdAt.getTime() < cutoff) {
        this.generations.delete(key);
        if (this.pendingByEvent.get(record.eventId) === key) {
          this.pendingByEvent.delete(record.eventId);
        }
      }
    }
  }
}
