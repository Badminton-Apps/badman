import { DrawCompetition } from "@badman/backend-database";
import { Injectable, Logger, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { Op } from "sequelize";
import { reindexByKey } from "./dataloader-helpers";

/**
 * Request-scoped DataLoader for batching DrawCompetition lookups by ID.
 *
 * Collects all draw IDs arriving in one microtask tick (one per
 * EncounterCompetition row), issues a single
 * `DrawCompetition.findAll({ where: { id: { [Op.in]: [...ids] } } })`, and
 * resolves every caller from the shared result.  Missing IDs resolve to
 * `null`.  The instance is discarded at request end so no cross-request
 * cache leakage occurs.
 *
 * Reused by: EncounterCompetitionResolver (drawCompetition field resolver).
 * May be reused by feature 025 (DrawCompetition.subEventCompetition).
 */
@Injectable({ scope: Scope.REQUEST })
export class DrawCompetitionLoaderService {
  private readonly logger = new Logger(DrawCompetitionLoaderService.name);
  private readonly loader = new DataLoader<string, DrawCompetition | null>((ids) =>
    this.batchDrawsByIds(ids)
  );

  /**
   * Load a DrawCompetition by ID.  Returns `null` when the ID is falsy or
   * the row does not exist.
   */
  load(id: string | null | undefined): Promise<DrawCompetition | null> {
    if (!id) return Promise.resolve(null);
    return this.loader.load(id);
  }

  private async batchDrawsByIds(ids: readonly string[]): Promise<(DrawCompetition | null)[]> {
    try {
      if (ids.length > 1 && process.env["NODE_ENV"] !== "production") {
        this.logger.debug(`batched ${ids.length} draw-competition lookups`);
      }
      const draws = await DrawCompetition.findAll({ where: { id: { [Op.in]: [...ids] } } });
      return reindexByKey(ids, draws, (d) => d.id);
    } catch (err) {
      this.logger.error(`batch draw-competition load failed for ${ids.length} ids`, err);
      throw err;
    }
  }
}
