import { SyncCheckpoint } from "@badman/backend-database";
import type { CheckpointEntityType } from "@badman/backend-database";
import { Injectable, Logger } from "@nestjs/common";

/**
 * Upserts per-entity resume pointers in twizzit.sync_checkpoint.
 */
@Injectable()
export class SyncCheckpointService {
  private readonly logger = new Logger(SyncCheckpointService.name);

  async upsert(opts: {
    syncRunId: string;
    entityType: CheckpointEntityType;
    lastOffset: number;
    pageSize: number;
    recordsWritten: number;
  }): Promise<void> {
    const { syncRunId, entityType, lastOffset, pageSize, recordsWritten } = opts;

    const [checkpoint, created] = await SyncCheckpoint.findOrCreate({
      where: { syncRunId, entityType },
      defaults: {
        syncRunId,
        entityType,
        lastOffset,
        pageSize,
        recordsWritten,
      },
    });

    if (!created) {
      checkpoint.lastOffset = lastOffset;
      checkpoint.pageSize = pageSize;
      checkpoint.recordsWritten = recordsWritten;
      checkpoint.updatedAt = new Date();
      await checkpoint.save();
    }

    this.logger.debug("Checkpoint upserted", { syncRunId, entityType, lastOffset, recordsWritten });
  }

  async find(
    syncRunId: string,
    entityType: CheckpointEntityType
  ): Promise<SyncCheckpoint | null> {
    return SyncCheckpoint.findOne({ where: { syncRunId, entityType } });
  }

  async findLatestForEntity(entityType: CheckpointEntityType): Promise<SyncCheckpoint | null> {
    return SyncCheckpoint.findOne({
      where: { entityType },
      order: [["updatedAt", "DESC"]],
    });
  }
}
