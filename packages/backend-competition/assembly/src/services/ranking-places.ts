import { LatestRankingPlace, Player, RankingPlace } from "@badman/backend-database";

/**
 * Puts each player's place from `findLatestRankingPlaces` where the line-up code
 * reads it, `player.rankingPlaces[0]`, as an eager-loaded include used to. A
 * player without a place gets an empty list.
 *
 * Sets the data value as well, so `player.toJSON()` (PDF export) sees it too.
 */
export function attachRankingPlaces(
  players: Player[],
  places: Map<string, LatestRankingPlace>
): void {
  for (const player of players) {
    const place = places.get(player.id);
    const rankingPlaces = (place ? [place] : []) as unknown as RankingPlace[];
    player.rankingPlaces = rankingPlaces;
    if (typeof player.setDataValue === "function") {
      player.setDataValue("rankingPlaces", rankingPlaces);
    }
  }
}
