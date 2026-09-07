import { Player, RankingLastPlace, RankingSystem } from "@badman/backend-database";
import { Transaction } from "sequelize";

// Module-level cache — safe for a long-running worker process.
// Reset on next startup if the primary system changes.
let _primarySystemId: string | null | undefined = undefined;

async function getPrimarySystemId(transaction?: Transaction): Promise<string | null> {
  if (_primarySystemId !== undefined) return _primarySystemId;

  const system = await RankingSystem.findOne({
    where: { primary: true },
    attributes: ["id"],
    transaction,
  });

  _primarySystemId = system?.id ?? null;
  return _primarySystemId;
}

/**
 * Ensures a new player has at least the default ranking (12-12-12) in the
 * primary ranking system. Uses findOrCreate so it never overwrites a real
 * ranking that may already exist.
 */
export async function ensureDefaultRanking(
  player: Player,
  options: { transaction?: Transaction; systemId?: string } = {}
): Promise<void> {
  if (!player.id) return;

  const systemId = options.systemId ?? (await getPrimarySystemId(options.transaction));
  if (!systemId) return;

  await RankingLastPlace.findOrCreate({
    where: { playerId: player.id, systemId },
    defaults: {
      playerId: player.id,
      systemId,
      single: 12,
      double: 12,
      mix: 12,
      gender: player.gender,
    },
    transaction: options.transaction,
  });
}
