import { EventCompetition } from "@badman/backend-database";
import { Injectable, Logger, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { Op } from "sequelize";
import { reindexByKey } from "./dataloader-helpers";

/**
 * Request-scoped DataLoader for batching EventCompetition lookups by ID.
 *
 * Collects all `eventCompetitionId` values arriving in one microtask tick,
 * issues a single `EventCompetition.findAll({ where: { id: { [Op.in]: [...ids] } } })`,
 * and resolves every caller from the shared result.  Missing IDs resolve to
 * `null`.  The instance is discarded at request end so no cross-request
 * cache leakage occurs.
 *
 * Reused by: SubEventCompetitionResolver.eventCompetition field resolver.
 */
@Injectable({ scope: Scope.REQUEST })
export class EventCompetitionLoaderService {
  private readonly logger = new Logger(EventCompetitionLoaderService.name);
  private readonly loader = new DataLoader<string, EventCompetition | null>((ids) =>
    this.batchEventCompetitionsByIds(ids)
  );

  /**
   * Load an EventCompetition by ID.  Returns `null` when the ID is falsy or
   * the row does not exist.
   */
  load(id: string | null | undefined): Promise<EventCompetition | null> {
    if (!id) return Promise.resolve(null);
    return this.loader.load(id);
  }

  private async batchEventCompetitionsByIds(
    ids: readonly string[]
  ): Promise<(EventCompetition | null)[]> {
    try {
      if (ids.length > 1 && process.env["NODE_ENV"] !== "production") {
        this.logger.debug(`batched ${ids.length} event-competition lookups`);
      }
      const events = await EventCompetition.findAll({ where: { id: { [Op.in]: [...ids] } } });
      return reindexByKey(ids, events, (e) => e.id);
    } catch (err) {
      this.logger.error(`batch event-competition load failed for ${ids.length} ids`, err);
      throw err;
    }
  }
}
