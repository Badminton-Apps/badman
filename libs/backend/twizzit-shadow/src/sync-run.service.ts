import { SyncRun } from "@badman/backend-database";
import { Injectable, Logger } from "@nestjs/common";

export interface SyncRunResult {
  runId: string;
  status: "completed" | "failed";
  counts: Record<string, number>;
  errorSummary?: string;
}

/**
 * Lifecycle management for twizzit.sync_run rows.
 * Transitions: pending → running → completed | failed.
 */
@Injectable()
export class SyncRunService {
  private readonly logger = new Logger(SyncRunService.name);

  async create(opts: {
    organizationId?: number;
    pageSize: number;
    interPageDelayMs: number;
  }): Promise<SyncRun> {
    const run = await SyncRun.create({
      status: "pending",
      organizationId: opts.organizationId ?? null,
      pageSize: opts.pageSize,
      interPageDelayMs: opts.interPageDelayMs,
      startedAt: null,
      finishedAt: null,
      counts: null,
      errorSummary: null,
    });
    this.logger.log(`Created sync_run ${run.id} (pending)`);
    return run;
  }

  async markRunning(run: SyncRun): Promise<void> {
    run.status = "running";
    run.startedAt = new Date();
    await run.save();
    this.logger.log(`sync_run ${run.id} → running`);
  }

  async markCompleted(run: SyncRun, counts: Record<string, number>): Promise<void> {
    run.status = "completed";
    run.finishedAt = new Date();
    run.counts = counts;
    await run.save();
    this.logger.log(`sync_run ${run.id} → completed`, { counts });
  }

  async markFailed(run: SyncRun, error: Error | string): Promise<void> {
    const msg = error instanceof Error ? error.message : error;
    run.status = "failed";
    run.finishedAt = new Date();
    run.errorSummary = msg.slice(0, 2000);
    await run.save();
    this.logger.error(`sync_run ${run.id} → failed: ${msg}`);
  }

  async findLastCompleted(): Promise<SyncRun | null> {
    return SyncRun.findOne({
      where: { status: "completed" },
      order: [["finishedAt", "DESC"]],
    });
  }
}
