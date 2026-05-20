import { Player, RankingLastPlace } from "@badman/backend-database";
import { RankingSystemService } from "@badman/backend-ranking";
import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { Op } from "sequelize";

/**
 * Request-scoped batching for Player field resolvers.
 *
 * Mirrors `TeamAssociationService`: each DataLoader collects all keys
 * requested within one microtask, issues a single `findAll({ ... [Op.in] })`
 * per loader, and resolves every caller from the shared result. The instance
 * is discarded when the request ends, so no cross-request cache can leak.
 */
@Injectable({ scope: Scope.REQUEST })
export class PlayerAssociationService {
  constructor(private readonly rankingSystemService: RankingSystemService) {}

  private readonly primaryRankingLastPlacesLoader = new DataLoader<string, RankingLastPlace[]>(
    (playerIds) => this.batchPrimaryRankingLastPlacesByPlayerIds(playerIds)
  );

  async getPrimaryRankingLastPlaces(player: Player): Promise<RankingLastPlace[]> {
    if (!player.id) return [];
    return this.primaryRankingLastPlacesLoader.load(player.id);
  }

  private async batchPrimaryRankingLastPlacesByPlayerIds(
    playerIds: readonly string[]
  ): Promise<RankingLastPlace[][]> {
    const primary = await this.rankingSystemService.getPrimary();
    if (!primary) return playerIds.map(() => []);

    const rows = await RankingLastPlace.findAll({
      where: { playerId: { [Op.in]: [...playerIds] }, systemId: primary.id },
      order: [["rankingDate", "DESC"]],
    });

    const grouped = new Map<string, RankingLastPlace[]>();
    for (const row of rows) {
      if (!row.playerId) continue;
      const bucket = grouped.get(row.playerId) ?? [];
      bucket.push(row);
      grouped.set(row.playerId, bucket);
    }
    return playerIds.map((id) => grouped.get(id) ?? []);
  }
}
