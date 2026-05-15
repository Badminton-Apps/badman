import { Injectable, Logger } from "@nestjs/common";
import { SyncRunService } from "./sync-run.service";
import { TruncateShadowTablesService } from "./truncate-shadow-tables.service";

export type RunMode = "resume" | "full-refetch";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Determines whether to resume from the last run or perform a full re-fetch.
 *
 * FR-015 / FR-016 / FR-017:
 *  - If last completed run < 7 days ago → resume (return the run id to read checkpoints from).
 *  - If last completed run ≥ 7 days ago OR TWIZZIT_SHADOW_FORCE_FULL_REFETCH=1 → full re-fetch.
 *  - Full re-fetch: truncate all shadow entity tables first.
 */
@Injectable()
export class RunModeService {
  private readonly logger = new Logger(RunModeService.name);

  constructor(
    private readonly syncRunService: SyncRunService,
    private readonly truncateService: TruncateShadowTablesService
  ) {}

  async resolveMode(): Promise<{ mode: RunMode; resumeFromRunId: string | null }> {
    const forceFullRefetch = process.env["TWIZZIT_SHADOW_FORCE_FULL_REFETCH"] === "1";

    if (forceFullRefetch) {
      this.logger.log("TWIZZIT_SHADOW_FORCE_FULL_REFETCH=1 → full re-fetch");
      await this.truncateService.truncate();
      return { mode: "full-refetch", resumeFromRunId: null };
    }

    const lastCompleted = await this.syncRunService.findLastCompleted();

    if (!lastCompleted || !lastCompleted.finishedAt) {
      this.logger.log("No previous completed run → full re-fetch");
      await this.truncateService.truncate();
      return { mode: "full-refetch", resumeFromRunId: null };
    }

    const age = Date.now() - lastCompleted.finishedAt.getTime();
    if (age >= SEVEN_DAYS_MS) {
      this.logger.log(
        `Last completed run is ${Math.round(age / 86400000)}d old (≥ 7d) → full re-fetch`
      );
      await this.truncateService.truncate();
      return { mode: "full-refetch", resumeFromRunId: null };
    }

    this.logger.log(
      `Last completed run ${lastCompleted.id} is recent (${Math.round(age / 3600000)}h) → resume`
    );
    return { mode: "resume", resumeFromRunId: lastCompleted.id };
  }
}
