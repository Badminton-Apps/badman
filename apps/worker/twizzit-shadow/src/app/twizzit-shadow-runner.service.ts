import { TwizzitShadowIngestService } from "@badman/backend-twizzit-shadow";
import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * Boots the shadow sync pipeline if TWIZZIT_SHADOW_RUN_ON_BOOT=1.
 * Otherwise the worker stays idle (health endpoint only).
 */
@Injectable()
export class TwizzitShadowRunnerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TwizzitShadowRunnerService.name);

  constructor(
    private readonly ingestService: TwizzitShadowIngestService,
    private readonly config: ConfigService
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const runOnBoot = this.config.get<string>("TWIZZIT_SHADOW_RUN_ON_BOOT");
    if (runOnBoot !== "1") {
      this.logger.log(
        "TWIZZIT_SHADOW_RUN_ON_BOOT is not set to 1 — worker is idle (health-only mode)"
      );
      return;
    }

    const pageSize = Number(this.config.get("TWIZZIT_SHADOW_PAGE_SIZE") ?? 100);
    const interPageDelayMs = Number(
      this.config.get("TWIZZIT_SHADOW_INTER_PAGE_DELAY_MS") ?? 250
    );
    const organizationId = this.config.get("TWIZZIT_ORGANIZATION_ID")
      ? Number(this.config.get("TWIZZIT_ORGANIZATION_ID"))
      : undefined;

    this.logger.log("Starting full backfill", { pageSize, interPageDelayMs, organizationId });

    const result = await this.ingestService.runFullBackfill({
      pageSize,
      interPageDelayMs,
      organizationId,
    });

    this.logger.log("Backfill finished", result);

    process.exit(result.status === "completed" ? 0 : 1);
  }
}
