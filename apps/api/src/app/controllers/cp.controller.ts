import { User } from "@badman/backend-authorization";
import { Player } from "@badman/backend-database";
import { CpDataCollector } from "@badman/backend-generator";
import { MailingService } from "@badman/backend-mailing";
import { ConfigType, IsUUID } from "@badman/utils";
import {
  BadGatewayException,
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  GoneException,
  Headers,
  HttpException,
  Logger,
  NotFoundException,
  OnModuleInit,
  Param,
  Post,
  Res,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AllowAnonymous } from "@badman/backend-authorization";
import { FastifyReply } from "fastify";

interface CpGenerationRecord {
  runId: string;
  userId: string;
  eventId: string;
  locale: string;
  status: "pending" | "completed" | "failed";
  createdAt: Date;
  gistId?: string;
}

@Controller("cp")
export class CpController implements OnModuleInit {
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
    private configService: ConfigService<ConfigType>,
    private mailingService: MailingService
  ) {}

  onModuleInit() {
    const secret = this.configService.get("CP_WEBHOOK_SECRET");
    if (!secret) {
      this.logger.warn("CP_WEBHOOK_SECRET is not configured — all webhook calls will be rejected");
    }
  }

  @Post("generate")
  async generate(@User() user: Player, @Body() body: { eventId: string; locale?: string }) {
    if (!user?.id) {
      throw new UnauthorizedException("Authentication required");
    }

    const hasPermission = await user.hasAnyPermission(["edit:competition"]);

    if (!hasPermission) {
      throw new ForbiddenException("Insufficient permissions");
    }

    this._cleanupExpiredRecords();

    const { eventId, locale = "nl_BE" } = body;
    if (!eventId || !IsUUID(eventId)) {
      throw new BadRequestException("eventId must be a valid UUID");
    }

    // Prevent concurrent generation for the same event
    const existingPending = this.pendingByEvent.get(eventId);
    if (existingPending) {
      const record = this.generations.get(existingPending);
      if (record && record.status === "pending") {
        const ageMinutes = (Date.now() - record.createdAt.getTime()) / 1000 / 60;
        if (ageMinutes < 15) {
          throw new ConflictException(
            "A CP generation is already in progress for this event. Please wait for it to complete."
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

    // Trigger GitHub Actions workflow
    const githubToken = this.configService.get("GH_TOKEN_CP");
    const repoOwner = this.configService.get("GITHUB_REPO_OWNER") || "Badminton-Apps";
    const repoName = this.configService.get("GITHUB_REPO_NAME") || "badman";
    const callbackUrl = this.configService.get("CP_CALLBACK_URL");

    if (!githubToken) {
      throw new ServiceUnavailableException("CP export is not configured (missing GH_TOKEN_CP)");
    }
    if (!callbackUrl) {
      throw new ServiceUnavailableException(
        "CP export is not configured (missing CP_CALLBACK_URL)"
      );
    }

    let gistId: string;
    try {
      gistId = await this._createGist(JSON.stringify(payload), githubToken);
    } catch {
      throw new BadGatewayException("Failed to upload payload to GitHub Gist");
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
        ref: "main",
        inputs: {
          gist_id: gistId,
          callback_url: callbackUrl,
          requesting_user_id: user.id,
        },
      }),
    });

    if (response.status !== 204) {
      const errorBody = await response.text();
      this.logger.error(`GitHub API error: ${response.status} ${errorBody}`);
      await this._deleteGist(gistId, githubToken);
      throw new BadGatewayException(
        `Failed to trigger CP generation: GitHub API returned ${response.status}`
      );
    }

    // Track pending generation (we don't get a run_id from dispatch, the webhook will provide it)
    const trackingId = `${eventId}-${Date.now()}`;
    const record: CpGenerationRecord = {
      runId: trackingId,
      userId: user.id,
      eventId,
      locale,
      status: "pending",
      createdAt: new Date(),
      gistId,
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

    this._cleanupExpiredRecords();

    // T007: Validate required fields
    if (!body.run_id || !body.user_id || !body.status) {
      throw new BadRequestException("run_id, user_id, and status are required");
    }

    // T008: Validate status enum
    if (body.status !== "completed" && body.status !== "failed") {
      throw new BadRequestException(
        `Invalid status: ${body.status}. Must be "completed" or "failed"`
      );
    }

    // T009: Idempotency guard
    const existingRecord = this.generations.get(body.run_id);
    if (existingRecord && existingRecord.status !== "pending") {
      this.logger.warn("Duplicate webhook delivery", {
        runId: body.run_id,
        existingStatus: existingRecord.status,
      });
      return { ok: true };
    }

    // T010: Structured receipt log
    this.logger.log("Webhook received", {
      runId: body.run_id,
      userId: body.user_id,
      status: body.status,
    });

    // Find the pending record for this user and update it with the real run_id
    let matchedTrackingId: string | undefined;
    for (const [trackingId, record] of this.generations) {
      if (record.userId === body.user_id && record.status === "pending") {
        record.runId = body.run_id;
        record.status = body.status === "completed" ? "completed" : "failed";
        matchedTrackingId = trackingId;

        // T004: Best-effort Gist cleanup wrapped in try/catch
        if (record.gistId) {
          const githubToken = this.configService.get("GH_TOKEN_CP");
          if (githubToken) {
            try {
              await this._deleteGist(record.gistId, githubToken);
            } catch (e) {
              this.logger.warn("Gist cleanup failed", {
                gistId: record.gistId,
                error: String(e),
              });
            }
          }
        }

        // Clean up pending-by-event
        this.pendingByEvent.delete(record.eventId);
        break;
      }
    }

    // T011: Structured record-match log
    if (matchedTrackingId) {
      this.logger.log("Matched pending record", {
        runId: body.run_id,
        trackingId: matchedTrackingId,
      });
    } else {
      this.logger.warn("No pending record found — storing by run_id directly", {
        runId: body.run_id,
        userId: body.user_id,
      });
    }

    // Also store by run_id for download lookups
    if (matchedTrackingId) {
      const record = this.generations.get(matchedTrackingId);
      if (record) {
        this.generations.set(body.run_id, record);
      }
    } else {
      // No pending record found (e.g. API restarted) — store directly by run_id
      this.generations.set(body.run_id, {
        runId: body.run_id,
        userId: body.user_id,
        eventId: "",
        locale: "nl_BE",
        status: body.status === "completed" ? "completed" : "failed",
        createdAt: new Date(),
      });
    }

    // T005/T006: Send email notification wrapped in try/catch
    if (body.status === "completed") {
      try {
        await this._sendCompletionEmail(body.user_id, body.run_id);
        this.logger.log("Completion email dispatched", {
          runId: body.run_id,
          userId: body.user_id,
        });
      } catch (e) {
        this.logger.error("Failed to send completion email", {
          runId: body.run_id,
          userId: body.user_id,
          error: String(e),
        });
      }
    } else {
      try {
        await this._sendFailureEmail(body.user_id);
        this.logger.log("Failure email dispatched", {
          runId: body.run_id,
          userId: body.user_id,
        });
      } catch (e) {
        this.logger.error("Failed to send failure email", {
          runId: body.run_id,
          userId: body.user_id,
          error: String(e),
        });
      }
    }

    return { ok: true };
  }

  @Get("download/:runId")
  @AllowAnonymous()
  async download(@Param("runId") runId: string, @Res() res: FastifyReply) {
    const record = this.generations.get(runId);
    if (!record) {
      throw new NotFoundException("Generation not found or expired");
    }

    if (record.status === "failed") {
      throw new GoneException("This generation failed. Please try again.");
    }

    if (record.status === "pending") {
      throw new HttpException(
        "This generation is still in progress. Please wait for the email notification.",
        202
      );
    }

    // Fetch artifact from GitHub
    const githubToken = this.configService.get("GH_TOKEN_CP");
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
        throw new GoneException(
          "CP file has expired (artifacts are kept for 30 days). Please regenerate."
        );
      }
      throw new BadGatewayException(
        `Failed to fetch artifact: GitHub API returned ${artifactsRes.status}`
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
      throw new BadGatewayException(`Failed to download artifact: ${downloadRes.status}`);
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

    const callbackUrl = this.configService.get("CP_CALLBACK_URL") || "";
    const downloadUrl = callbackUrl.replace("/webhook", `/download/${runId}`);

    this.logger.log(
      `CP file ready for user ${player.fullName} (${player.email}). Download: ${downloadUrl}`
    );

    await this.mailingService.sendCpExportReadyMail(
      { fullName: player.fullName, email: player.email, slug: player.slug },
      downloadUrl
    );
  }

  private async _sendFailureEmail(userId: string): Promise<void> {
    const player = await Player.findByPk(userId);
    if (!player?.email) {
      this.logger.warn(`Cannot send CP failure email: user ${userId} has no email`);
      return;
    }

    await this.mailingService.sendCpExportFailedMail({
      fullName: player.fullName,
      email: player.email,
      slug: player.slug,
    });
  }

  private async _createGist(content: string, token: string): Promise<string> {
    const res = await fetch("https://api.github.com/gists", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        public: false,
        files: { "payload.json": { content } },
      }),
    });

    if (res.status !== 201) {
      const body = await res.text();
      this.logger.error(`Gist create failed: ${res.status} ${body}`);
      throw new BadGatewayException(`GitHub Gist API returned ${res.status}`);
    }

    const data = (await res.json()) as { id: string };
    return data.id;
  }

  private async _deleteGist(gistId: string, token: string): Promise<void> {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (res.status !== 204 && res.status !== 404) {
      this.logger.warn(`Gist delete returned unexpected status ${res.status} for gist ${gistId}`);
    }
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
