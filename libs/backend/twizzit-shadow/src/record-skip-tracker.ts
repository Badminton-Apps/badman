import { Injectable } from "@nestjs/common";

export interface SkippedRecord {
  entityType: string;
  twizzitId: string | number | null;
  reason: string;
}

/**
 * Collects skipped records during a sync run so callers can persist
 * the summary in sync_run.counts / error_summary.
 */
@Injectable()
export class RecordSkipTracker {
  private readonly skipped: SkippedRecord[] = [];

  reset(): void {
    this.skipped.length = 0;
  }

  record(entry: SkippedRecord): void {
    this.skipped.push(entry);
  }

  getAll(): SkippedRecord[] {
    return [...this.skipped];
  }

  count(): number {
    return this.skipped.length;
  }
}
