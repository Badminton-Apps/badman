import type { CheckpointEntityType } from "@badman/backend-database";
import type { FederationGateway } from "@badman/integrations-twizzit-client";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { Sequelize } from "sequelize-typescript";
import { runPageLoop } from "./pagination/page-runner";
import { RecordSkipTracker } from "./record-skip-tracker";
import { RunModeService } from "./run-mode.service";
import { ShadowUpsertService } from "./shadow-upsert.service";
import { SyncCheckpointService } from "./sync-checkpoint.service";
import { SyncRunService, SyncRunResult } from "./sync-run.service";
import { FEDERATION_GATEWAY } from "./tokens";

export interface TwizzitShadowIngestConfig {
  pageSize: number;
  interPageDelayMs: number;
  organizationId?: number;
}

@Injectable()
export class TwizzitShadowIngestService {
  private readonly logger = new Logger(TwizzitShadowIngestService.name);

  constructor(
    @Inject(FEDERATION_GATEWAY) private readonly gateway: FederationGateway,
    private readonly sequelize: Sequelize,
    private readonly syncRunService: SyncRunService,
    private readonly checkpointService: SyncCheckpointService,
    private readonly upsertService: ShadowUpsertService,
    private readonly runModeService: RunModeService,
    private readonly skipTracker: RecordSkipTracker
  ) {}

  async runFullBackfill(config: TwizzitShadowIngestConfig): Promise<SyncRunResult> {
    const { pageSize, interPageDelayMs, organizationId } = config;

    this.skipTracker.reset();

    const { mode, resumeFromRunId } = await this.runModeService.resolveMode();
    this.logger.log(`Run mode: ${mode}`, { resumeFromRunId });

    const run = await this.syncRunService.create({ organizationId, pageSize, interPageDelayMs });
    await this.syncRunService.markRunning(run);

    const counts: Record<string, number> = {
      organizations: 0,
      extraFields: 0,
      membershipTypes: 0,
      memberships: 0,
      contacts: 0,
    };

    try {
      // --- Reference entities (no pagination) ---
      counts.organizations = await this.ingestOrganizations(run.id);
      counts.extraFields = await this.ingestExtraFields(run.id);
      counts.membershipTypes = await this.ingestMembershipTypes(run.id);

      // --- Paginated entities ---
      counts.memberships = await this.ingestMemberships(
        run.id,
        config,
        mode === "resume" ? resumeFromRunId : null
      );
      counts.contacts = await this.ingestContacts(
        run.id,
        config,
        mode === "resume" ? resumeFromRunId : null
      );

      counts.skipped = this.skipTracker.count();

      await this.syncRunService.markCompleted(run, counts);
      this.logger.log("Full backfill completed", { runId: run.id, counts });

      return { runId: run.id, status: "completed", counts };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      await this.syncRunService.markFailed(run, error);
      this.logger.error("Full backfill failed", { runId: run.id, error: error.message });
      return {
        runId: run.id,
        status: "failed",
        counts,
        errorSummary: error.message,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Reference entity ingests (small lists — no pagination)
  // ---------------------------------------------------------------------------

  private async ingestOrganizations(syncRunId: string): Promise<number> {
    const start = Date.now();
    let written = 0;

    try {
      const orgs = await this.gateway.fetchOrganizations();
      const t = await this.sequelize.transaction();
      try {
        written = await this.upsertService.upsertOrganization(orgs, syncRunId, t);
        await t.commit();
      } catch (err) {
        await t.rollback();
        throw err;
      }
    } catch (err) {
      this.logger.error("Failed to ingest organizations", { error: (err as Error).message });
      throw err;
    }

    this.logger.log("Ingested organizations", {
      syncRunId,
      entityType: "organization",
      offset: 0,
      pageSize: 0,
      recordsInPage: written,
      durationMs: Date.now() - start,
    });
    return written;
  }

  private async ingestExtraFields(syncRunId: string): Promise<number> {
    const start = Date.now();
    let written = 0;

    try {
      const fields = await this.gateway.fetchExtraFields();
      const t = await this.sequelize.transaction();
      try {
        written = await this.upsertService.upsertExtraField(fields, syncRunId, t);
        await t.commit();
      } catch (err) {
        await t.rollback();
        throw err;
      }
    } catch (err) {
      this.logger.error("Failed to ingest extra_fields", { error: (err as Error).message });
      throw err;
    }

    this.logger.log("Ingested extra_fields", {
      syncRunId,
      entityType: "extra_field",
      offset: 0,
      pageSize: 0,
      recordsInPage: written,
      durationMs: Date.now() - start,
    });
    return written;
  }

  private async ingestMembershipTypes(syncRunId: string): Promise<number> {
    const start = Date.now();
    let written = 0;

    try {
      const types = await this.gateway.fetchMembershipTypes();
      const t = await this.sequelize.transaction();
      try {
        written = await this.upsertService.upsertMembershipType(types, syncRunId, t);
        await t.commit();
      } catch (err) {
        await t.rollback();
        throw err;
      }
    } catch (err) {
      this.logger.error("Failed to ingest membership_types", { error: (err as Error).message });
      throw err;
    }

    this.logger.log("Ingested membership_types", {
      syncRunId,
      entityType: "membership_type",
      offset: 0,
      pageSize: 0,
      recordsInPage: written,
      durationMs: Date.now() - start,
    });
    return written;
  }

  // ---------------------------------------------------------------------------
  // Paginated entity ingests (memberships + contacts)
  // ---------------------------------------------------------------------------

  private async ingestMemberships(
    syncRunId: string,
    config: TwizzitShadowIngestConfig,
    resumeFromRunId: string | null
  ): Promise<number> {
    return this.ingestPaginated(
      syncRunId,
      "membership",
      config,
      resumeFromRunId,
      async (offset, pageSize) => {
        const client = this.gateway as import("@badman/integrations-twizzit-client").TwizzitClient;
        if (typeof client.getMembershipsPage === "function") {
          return client.getMembershipsPage({ offset, pageSize });
        }
        return this.gateway.fetchMemberships({ pageSize, maxPages: 1 });
      },
      async (items, runId, t) => {
        return this.upsertService.upsertMembership(items as never[], runId, t);
      }
    );
  }

  private async ingestContacts(
    syncRunId: string,
    config: TwizzitShadowIngestConfig,
    resumeFromRunId: string | null
  ): Promise<number> {
    return this.ingestPaginated(
      syncRunId,
      "contact",
      config,
      resumeFromRunId,
      async (offset, pageSize) => {
        const client = this.gateway as import("@badman/integrations-twizzit-client").TwizzitClient;
        if (typeof client.getContactsPage === "function") {
          return client.getContactsPage({ offset, pageSize });
        }
        return this.gateway.fetchContacts({ pageSize, maxPages: 1 });
      },
      async (items, runId, t) => {
        return this.upsertService.upsertContact(items as never[], runId, t);
      }
    );
  }

  /**
   * Generic paginated ingest loop.
   * Uses `page-runner` for offset stepping + delay.
   * Writes a checkpoint after each committed page.
   * Per-page transactions: commit or rollback; on DB failure marks run failed.
   */
  private async ingestPaginated<T>(
    syncRunId: string,
    entityType: CheckpointEntityType,
    config: TwizzitShadowIngestConfig,
    resumeFromRunId: string | null,
    fetchFn: (offset: number, pageSize: number) => Promise<T[]>,
    upsertFn: (items: T[], syncRunId: string, t: import("sequelize").Transaction) => Promise<number>
  ): Promise<number> {
    const { pageSize, interPageDelayMs } = config;
    let totalWritten = 0;

    // Determine resume offset
    let startOffset = 0;
    if (resumeFromRunId) {
      const checkpoint = await this.checkpointService.find(resumeFromRunId, entityType);
      if (checkpoint) {
        startOffset = checkpoint.lastOffset + checkpoint.pageSize;
        totalWritten = Number(checkpoint.recordsWritten);
        this.logger.log(`Resuming ${entityType} from offset ${startOffset}`, {
          syncRunId,
          resumeFromRunId,
        });
      }
    }

    await runPageLoop<T>(
      fetchFn,
      async (items, offset) => {
        const start = Date.now();

        if (items.length === 0) {
          return false;
        }

        const t = await this.sequelize.transaction();
        let written = 0;
        try {
          written = await upsertFn(items, syncRunId, t);
          await t.commit();
        } catch (err) {
          await t.rollback();
          this.logger.error(`Page transaction failed for ${entityType} at offset ${offset}`, {
            error: (err as Error).message,
          });
          throw err;
        }

        totalWritten += written;

        await this.checkpointService.upsert({
          syncRunId,
          entityType,
          lastOffset: offset,
          pageSize,
          recordsWritten: totalWritten,
        });

        this.logger.log(`Ingested ${entityType} page`, {
          syncRunId,
          entityType,
          offset,
          pageSize,
          recordsInPage: written,
          durationMs: Date.now() - start,
        });

        return true;
      },
      { pageSize, interPageDelayMs, startOffset }
    );

    return totalWritten;
  }

}

