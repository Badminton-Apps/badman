import { Player } from "@badman/backend-database";
import { Injectable, Logger, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { Op } from "sequelize";
import { reindexByKey } from "./dataloader-helpers";

/**
 * Request-scoped DataLoader for batching Player lookups by ID.
 *
 * Collects all `playerId` values arriving in one microtask tick, issues a
 * single `Player.findAll({ where: { id: { [Op.in]: [...ids] } } })`, and
 * resolves every caller from the shared result.  Missing IDs resolve to
 * `null`.  The instance is discarded at request end so no cross-request
 * cache leakage occurs.
 *
 * Reused by: RankingPointResolver, LastRankingPlaceResolver, CommentResolver.
 */
@Injectable({ scope: Scope.REQUEST })
export class PlayerLoaderService {
  private readonly logger = new Logger(PlayerLoaderService.name);
  private readonly loader = new DataLoader<string, Player | null>((ids) =>
    this.batchPlayersByIds(ids)
  );

  /**
   * Load a Player by ID.  Returns `null` when the ID is falsy or the row
   * does not exist.
   */
  load(id: string | null | undefined): Promise<Player | null> {
    if (!id) return Promise.resolve(null);
    return this.loader.load(id);
  }

  private async batchPlayersByIds(ids: readonly string[]): Promise<(Player | null)[]> {
    try {
      if (ids.length > 1 && process.env["NODE_ENV"] !== "production") {
        this.logger.debug(`batched ${ids.length} player lookups`);
      }
      const players = await Player.findAll({ where: { id: { [Op.in]: [...ids] } } });
      return reindexByKey(ids, players, (p) => p.id);
    } catch (err) {
      this.logger.error(`batch player load failed for ${ids.length} ids`, err);
      throw err;
    }
  }
}
