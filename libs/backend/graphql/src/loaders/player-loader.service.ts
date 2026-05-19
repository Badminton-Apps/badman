import { Player } from "@badman/backend-database";
import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { Op } from "sequelize";

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
    const players = await Player.findAll({ where: { id: { [Op.in]: [...ids] } } });
    const map = new Map(players.map((p) => [p.id, p]));
    return ids.map((id) => map.get(id) ?? null);
  }
}
