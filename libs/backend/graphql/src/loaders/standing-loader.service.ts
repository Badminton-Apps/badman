import { Standing } from "@badman/backend-database";
import { Injectable, Logger, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { Op } from "sequelize";
import { reindexByKey } from "./dataloader-helpers";

/**
 * Request-scoped DataLoader for batching Standing lookups by entryId.
 *
 * Collects all entry IDs arriving in one microtask tick (from multiple
 * EventEntry field-resolver calls), issues a single
 * `Standing.findAll({ where: { entryId: { [Op.in]: [...ids] } } })`, and
 * resolves every caller from the shared result.  Missing IDs resolve to
 * `null`.  The instance is discarded at request end so no cross-request
 * cache leakage occurs.
 *
 * Reused by: EventEntryResolver (standing field resolver).
 */
@Injectable({ scope: Scope.REQUEST })
export class StandingLoaderService {
  private readonly logger = new Logger(StandingLoaderService.name);
  private readonly loader = new DataLoader<string, Standing | null>((ids) =>
    this.batchStandingsByEntryIds(ids)
  );

  /**
   * Load a Standing by entryId.  Returns `null` when the ID is falsy or
   * the row does not exist.
   */
  load(entryId: string | null | undefined): Promise<Standing | null> {
    if (!entryId) return Promise.resolve(null);
    return this.loader.load(entryId);
  }

  private async batchStandingsByEntryIds(ids: readonly string[]): Promise<(Standing | null)[]> {
    try {
      if (ids.length > 1 && process.env["NODE_ENV"] !== "production") {
        this.logger.debug(`batched ${ids.length} standing lookups`);
      }
      const standings = await Standing.findAll({
        where: { entryId: { [Op.in]: [...ids] } },
      });
      return reindexByKey(ids, standings, (s) => s.entryId);
    } catch (err) {
      this.logger.error(`batch standing load failed for ${ids.length} ids`, err);
      throw err;
    }
  }
}
