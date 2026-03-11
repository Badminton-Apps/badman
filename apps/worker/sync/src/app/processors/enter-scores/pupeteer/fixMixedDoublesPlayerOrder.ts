import { Game } from "@badman/backend-database";
import { Logger } from "@nestjs/common";
import { Transaction } from "sequelize";

/**
 * Fix player order for mixed doubles - ensure male players are in position 1
 * @param game The game to fix player order for
 * @param transaction Database transaction
 * @param logger Logger instance for debugging
 */
export async function fixMixedDoublesPlayerOrder(
  game: Game,
  transaction?: Transaction,
  logger?: Logger
): Promise<void> {
  try {
    if (!game.players || game.players.length !== 4) {
      logger?.debug(`Game ${game.id} doesn't have 4 players, skipping MX doubles order fix`);
      return;
    }

    logger?.debug(`Checking MX doubles player order for game ${game.id}`);

    // Get players by team and position
    const t1p1 = game.players.find(
      (p) => p.GamePlayerMembership.team === 1 && p.GamePlayerMembership.player === 1
    );
    const t1p2 = game.players.find(
      (p) => p.GamePlayerMembership.team === 1 && p.GamePlayerMembership.player === 2
    );
    const t2p1 = game.players.find(
      (p) => p.GamePlayerMembership.team === 2 && p.GamePlayerMembership.player === 1
    );
    const t2p2 = game.players.find(
      (p) => p.GamePlayerMembership.team === 2 && p.GamePlayerMembership.player === 2
    );

    let needsTeam1Fix = false;
    let needsTeam2Fix = false;

    // Check Team 1: Position 1 should be male (M), Position 2 should be female (F)
    if (t1p1 && t1p2) {
      if (t1p1.gender === "F" && t1p2.gender === "M") {
        logger?.warn(
          `Team 1 has incorrect MX doubles order: P1=${t1p1.gender}(${t1p1.fullName}), P2=${t1p2.gender}(${t1p2.fullName}). Male should be P1.`
        );
        needsTeam1Fix = true;
      } else if (t1p1.gender === "M" && t1p2.gender === "F") {
        logger?.debug(
          `Team 1 MX doubles order is correct: P1=${t1p1.gender}(${t1p1.fullName}), P2=${t1p2.gender}(${t1p2.fullName})`
        );
      } else {
        logger?.warn(
          `Team 1 has unexpected gender combination: P1=${t1p1.gender}(${t1p1.fullName}), P2=${t1p2.gender}(${t1p2.fullName})`
        );
      }
    }

    // Check Team 2: Position 1 should be male (M), Position 2 should be female (F)
    if (t2p1 && t2p2) {
      if (t2p1.gender === "F" && t2p2.gender === "M") {
        logger?.warn(
          `Team 2 has incorrect MX doubles order: P1=${t2p1.gender}(${t2p1.fullName}), P2=${t2p2.gender}(${t2p2.fullName}). Male should be P1.`
        );
        needsTeam2Fix = true;
      } else if (t2p1.gender === "M" && t2p2.gender === "F") {
        logger?.debug(
          `Team 2 MX doubles order is correct: P1=${t2p1.gender}(${t2p1.fullName}), P2=${t2p2.gender}(${t2p2.fullName})`
        );
      } else {
        logger?.warn(
          `Team 2 has unexpected gender combination: P1=${t2p1.gender}(${t2p1.fullName}), P2=${t2p2.gender}(${t2p2.fullName})`
        );
      }
    }

    // Fix Team 1 if needed
    if (needsTeam1Fix && t1p1 && t1p2 && transaction) {
      logger?.log(
        `Fixing Team 1 MX doubles order: swapping ${t1p1.fullName}(F) and ${t1p2.fullName}(M)`
      );

      // Swap the player positions in the database
      await t1p1.GamePlayerMembership.update({ player: 2 }, { transaction });
      await t1p2.GamePlayerMembership.update({ player: 1 }, { transaction });

      // Update the in-memory objects to reflect the change
      t1p1.GamePlayerMembership.player = 2;
      t1p2.GamePlayerMembership.player = 1;

      logger?.log(
        `Team 1 order fixed: P1 is now ${t1p2.fullName}(M), P2 is now ${t1p1.fullName}(F)`
      );
    }

    // Fix Team 2 if needed
    if (needsTeam2Fix && t2p1 && t2p2 && transaction) {
      logger?.log(
        `Fixing Team 2 MX doubles order: swapping ${t2p1.fullName}(F) and ${t2p2.fullName}(M)`
      );

      // Swap the player positions in the database
      await t2p1.GamePlayerMembership.update({ player: 2 }, { transaction });
      await t2p2.GamePlayerMembership.update({ player: 1 }, { transaction });

      // Update the in-memory objects to reflect the change
      t2p1.GamePlayerMembership.player = 2;
      t2p2.GamePlayerMembership.player = 1;

      logger?.log(
        `Team 2 order fixed: P1 is now ${t2p2.fullName}(M), P2 is now ${t2p1.fullName}(F)`
      );
    }

    if (needsTeam1Fix || needsTeam2Fix) {
      logger?.log(`MX doubles player order correction completed for game ${game.id}`);
    }
  } catch (error) {
    logger?.error(`Error fixing MX doubles player order for game ${game.id}:`, error);
    // Don't throw - continue with the original order if fix fails
  }
}
