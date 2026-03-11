import { EncounterCompetition, Game } from "@badman/backend-database";
import { Logger } from "@nestjs/common";
import { Page } from "puppeteer";
import { selectPlayer } from "./selectPlayer";
import { Transaction } from "sequelize";
import { SubEventTypeEnum } from "@badman/utils";
import { enterScores } from "./enterScores";
import { enterWinner } from "./enterWinner";
import {
  getHeaderForAssemblyPosition,
  getAssemblyPositionsInOrder,
} from "./assemblyPositions";
import { matchGamesToAssembly } from "./matchGamesToAssembly";
import { fixMixedDoublesPlayerOrder } from "./fixMixedDoublesPlayerOrder";

/**
 * Find a game row by assembly position and team type
 * @param page Puppeteer page object
 * @param teamType The type of team (M, F, MX, NATIONAL)
 * @param assemblyPosition The assembly position (single1, single2, double1, etc.)
 * @param logger Logger instance for debugging
 * @returns The matchId if found, null otherwise
 */
async function findGameRowByAssemblyPosition(
  page: Page,
  teamType: SubEventTypeEnum,
  assemblyPosition: string,
  logger?: Logger
): Promise<string | null> {
  try {
    // Get the expected header text for this team type and assembly position
    const expectedHeader = getHeaderForAssemblyPosition(teamType, assemblyPosition);
    if (!expectedHeader) {
      logger?.error(
        `No header found for teamType ${teamType} and assemblyPosition ${assemblyPosition}`
      );
      return null;
    }

    logger?.debug(
      `Looking for game row with header: "${expectedHeader}" for teamType: ${teamType}, assemblyPosition: ${assemblyPosition}`
    );

    // Find all table rows that contain the expected header text
    const matchingRows = await page.$$eval(
      "tr",
      (rows, headerText) => {
        const results: { matchId: string; rowIndex: number }[] = [];
        const allHeaders: string[] = [];

        rows.forEach((row, index) => {
          // Look for th elements within this row that contain the expected header text
          const headerCells = Array.from(row.querySelectorAll("th"));

          // Collect all headers for debugging (only if we have header cells)
          if (headerCells.length > 0) {
            headerCells.forEach((cell) => {
              const text = cell.textContent?.trim();
              if (text) allHeaders.push(text);
            });
          }

          for (const headerCell of headerCells) {
            if (headerCell.textContent?.trim() === headerText) {
              // Found a matching header, now look for match inputs in this row
              const matchInputs = row.querySelectorAll('select[id^="match_"]');
              if (matchInputs.length > 0) {
                // Extract matchId from the first match input
                const firstInput = matchInputs[0] as HTMLSelectElement;
                const match = firstInput.id.match(/^match_(.+)_(t1p1|t1p2|t2p1|t2p2)$/);
                if (match) {
                  results.push({ matchId: match[1], rowIndex: index });
                }
              }
              break; // Found the header in this row, no need to check other th elements
            }
          }
        });

        return { results, allHeaders: [...new Set(allHeaders)] };
      },
      expectedHeader
    );

    // Only log debug info for HD1 and HD2 to avoid spam
    if (expectedHeader === "HD1" || expectedHeader === "HD2") {
      logger?.debug(`Headers found on page: ${matchingRows.allHeaders.join(", ")}`);
      logger?.debug(`Looking for exact match: "${expectedHeader}"`);
      logger?.debug(
        `Case-sensitive matches: ${matchingRows.allHeaders.filter((h) => h === expectedHeader).length}`
      );
      logger?.debug(
        `Case-insensitive matches: ${matchingRows.allHeaders.filter((h) => h.toLowerCase() === expectedHeader.toLowerCase()).length}`
      );
    }

    if (matchingRows.results.length === 0) {
      logger?.warn(`No rows found with header "${expectedHeader}"`);
      if (expectedHeader === "HD1" || expectedHeader === "HD2") {
        logger?.warn(`Available headers: ${matchingRows.allHeaders.join(", ")}`);
      }
      return null;
    }

    if (matchingRows.results.length > 1) {
      logger?.warn(`Multiple rows found with header "${expectedHeader}", using the first one`);
    }

    const selectedRow = matchingRows.results[0];
    logger?.debug(
      `Found game row with header "${expectedHeader}" at row index ${selectedRow.rowIndex}, matchId: ${selectedRow.matchId}`
    );

    // Verify that this row has empty player selections
    const isEmpty = await isGameRowEmpty(page, selectedRow.matchId, logger);
    if (!isEmpty) {
      logger?.error(
        `Game row with header "${expectedHeader}" (matchId: ${selectedRow.matchId}) is not empty - this suggests the clearFields function did not work properly, or the row was filled by another process. This is a critical error that requires investigation.`
      );
      return null;
    }

    return selectedRow.matchId;
  } catch (error) {
    logger?.error(
      `Error finding game row by assembly position for teamType ${teamType}, assemblyPosition ${assemblyPosition}:`,
      error
    );
    return null;
  }
}

/**
 * Check if a game row is empty (all player selectors have value "0" or empty)
 * @param page Puppeteer page object
 * @param matchId The matchId to check
 * @param logger Logger instance for debugging
 * @returns True if the row is empty, false otherwise
 */
async function isGameRowEmpty(page: Page, matchId: string, logger?: Logger): Promise<boolean> {
  try {
    const playerPositions = ["t1p1", "t1p2", "t2p1", "t2p2"];
    const nonEmptySelectors: string[] = [];

    for (const position of playerPositions) {
      const selectorId = `match_${matchId}_${position}`;
      const selector = await page.$(`#${selectorId}`);

      if (selector) {
        const selectedValue = await page.evaluate((el) => {
          const select = el as HTMLSelectElement;
          return select.value;
        }, selector);

        // If any selector has a value other than "0" or empty, the row is not empty
        if (selectedValue && selectedValue !== "0") {
          nonEmptySelectors.push(`${selectorId}="${selectedValue}"`);
        }
      } else {
        logger?.warn(`Selector #${selectorId} not found on page`);
      }
    }

    if (nonEmptySelectors.length > 0) {
      logger?.error(
        `Row matchId ${matchId} is not empty. Non-empty selectors: ${nonEmptySelectors.join(", ")}`
      );
      return false;
    }

    logger?.debug(`All selectors for matchId ${matchId} are empty`);
    return true;
  } catch (error) {
    logger?.error(`Error checking if game row is empty for matchId ${matchId}:`, error);
    return false;
  }
}

export async function enterGames(
  pupeteer: {
    page: Page | null;
    timeout?: number;
  } = {
    page: null,
    timeout: 5000,
  },
  args: {
    encounter: EncounterCompetition;
    transaction: Transaction;
    logger?: Logger;
  }
) {
  const { page, timeout } = pupeteer;
  const { encounter, transaction, logger } = args || {};
  const { games, assemblies } = encounter;
  logger?.verbose("enterGames");

  if (!page) {
    throw new Error("No page provided");
  }

  // Get team type for assembly matching
  const teamType: SubEventTypeEnum = encounter.home?.type as SubEventTypeEnum;

  if (!teamType) {
    logger?.error(`No teamType found for encounter, cannot process games`);
    return;
  }

  // Match games to assembly positions based on players
  const gameAssemblyMap = matchGamesToAssembly(games, assemblies, teamType, encounter, logger);

  // Get assembly positions in correct order for processing based on team type
  const orderedPositions = getAssemblyPositionsInOrder(teamType);

  logger?.log(`Ordered positions: ${orderedPositions}`);
  logger?.log(`Game assembly map size: ${gameAssemblyMap.size}`);
  logger?.log(
    `Game assembly map keys:`,
    Array.from(gameAssemblyMap.keys()).map((g) => g.id)
  );
  logger?.log(`Game assembly map values:`, Array.from(gameAssemblyMap.values()));

  // logger?.log(`Entering games using assembly-based ordering for teamType: ${teamType}`);

  // Process games in assembly order
  for (const assemblyPosition of orderedPositions) {
    // Find the game that matches this assembly position
    const gameEntry = Array.from(gameAssemblyMap.entries()).find(
      ([game, data]) => data.assemblyPosition === assemblyPosition
    );
    if (!gameEntry) {
      logger?.debug(`No game found for assembly position: ${assemblyPosition}`);
      continue;
    }
    const [game, assemblyData] = gameEntry;

    logger.verbose(`Processing game ${game.id} for assembly position: ${assemblyPosition}`);
    let matchId: string;

    // Always find the correct row based on assembly position to ensure proper ordering
    logger?.log(`Finding correct game row for ${assemblyPosition} with teamType: ${teamType}`);

    // Use the assembly-based approach to find the correct game row
    const correctMatchId = await findGameRowByAssemblyPosition(
      page,
      teamType,
      assemblyPosition,
      logger
    );

    if (!correctMatchId) {
      const errorMessage = `Could not find empty game row for assembly position ${assemblyPosition}. This indicates either the row doesn't exist or it's already filled. Since clearFields() should have cleared all rows, this suggests a critical issue with the clearing process or a race condition.`;
      logger?.error(errorMessage);
      throw new Error(errorMessage);
    }

    logger?.debug(
      `Found correct game row with matchId: ${correctMatchId} for assembly position: ${assemblyPosition}`
    );

    // Validate and correct the visualCode if necessary
    if (game?.visualCode && game.visualCode !== correctMatchId) {
      logger?.warn(
        `Game ${game.id} had incorrect visualCode: ${game.visualCode}, correcting to: ${correctMatchId}`
      );
    } else if (!game?.visualCode) {
      logger?.log(`Game ${game.id} had no visualCode, setting to: ${correctMatchId}`);
    } else {
      logger?.debug(`Game ${game.id} already has correct visualCode: ${correctMatchId}`);
    }

    // Set the correct matchId
    matchId = correctMatchId;
    game.visualCode = correctMatchId;

    // Save the corrected visualCode to database if transaction is provided
    if (transaction && game.id) {
      try {
        await game.save({ transaction });
        logger?.debug(
          `Saved corrected visualCode ${correctMatchId} to database for game ${game.id}`
        );
      } catch (error) {
        logger?.error(
          `Failed to save corrected visualCode to database for game ${game.id}:`,
          error
        );
        throw error;
      }
    }

    // Fix player order for MX doubles - male should always be in position 1
    if (teamType === SubEventTypeEnum.MX && assemblyPosition.startsWith("double")) {
      await fixMixedDoublesPlayerOrder(game, transaction, logger);
    }

    const t1p1 = game.players?.find(
      (p) => p.GamePlayerMembership.team === 1 && p.GamePlayerMembership.player === 1
    );

    if (t1p1) {
      if (!t1p1.memberId) {
        logger?.error(`Player ${t1p1.fullName} has no memberId, skipping`);
        continue;
      }
      logger?.log(`Selecting player ${t1p1.memberId} for game ${matchId}`);
      await selectPlayer({ page }, t1p1.memberId, "t1p1", matchId, logger);
    }

    const t1p2 = game.players?.find(
      (p) => p.GamePlayerMembership.team === 1 && p.GamePlayerMembership.player === 2
    );

    logger?.debug(`t1p2`, { id: t1p2?.id, memberId: t1p2?.memberId, fullName: t1p2?.fullName });
    if (t1p2) {
      if (!t1p2.memberId) {
        logger?.error(`Player ${t1p2.fullName} has no memberId, skipping`);
        continue;
      }
      logger?.log(`Selecting player ${t1p2.memberId} for game ${matchId}`);
      await selectPlayer({ page }, t1p2.memberId, "t1p2", matchId, logger);
    }

    const t2p1 = game.players?.find(
      (p) => p.GamePlayerMembership.team === 2 && p.GamePlayerMembership.player === 1
    );
    logger?.debug(`t2p1`, { id: t2p1?.id, memberId: t2p1?.memberId, fullName: t2p1?.fullName });
    if (t2p1) {
      if (!t2p1.memberId) {
        logger?.error(`Player ${t2p1.fullName} has no memberId, skipping`);
        continue;
      }
      logger?.debug(`Selecting player ${t2p1.memberId} for game ${matchId}`);
      await selectPlayer({ page }, t2p1.memberId, "t2p1", matchId, logger);
    }

    const t2p2 = game.players?.find(
      (p) => p.GamePlayerMembership.team === 2 && p.GamePlayerMembership.player === 2
    );
    if (t2p2) {
      if (!t2p2.memberId) {
        logger?.error(`Player ${t2p2.fullName} has no memberId, skipping`);
        continue;
      }
      logger?.log(`Selecting player ${t2p2.memberId} for game ${matchId}`);
      await selectPlayer({ page }, t2p2.memberId, "t2p2", matchId, logger);
    }

    // Enter set 1 scores if both teams have valid scores (not null/undefined) and it's not 0-0
    if (
      game.set1Team1 != null &&
      game.set1Team2 != null &&
      !(game.set1Team1 === 0 && game.set1Team2 === 0)
    ) {
      await enterScores(
        { page },
        1,
        `${game.set1Team1}-${game.set1Team2}`,
        matchId,
        logger
      );
    }

    // Enter set 2 scores if both teams have valid scores (not null/undefined) and it's not 0-0
    if (
      game.set2Team1 != null &&
      game.set2Team2 != null &&
      !(game.set2Team1 === 0 && game.set2Team2 === 0)
    ) {
      await enterScores(
        { page },
        2,
        `${game.set2Team1}-${game.set2Team2}`,
        matchId,
        logger
      );
    }

    // Enter set 3 scores if both teams have valid scores (not null/undefined) and it's not 0-0
    if (
      game.set3Team1 != null &&
      game.set3Team2 != null &&
      !(game.set3Team1 === 0 && game.set3Team2 === 0)
    ) {
      await enterScores(
        { page },
        3,
        `${game.set3Team1}-${game.set3Team2}`,
        matchId,
        logger
      );
    }

    if (game.winner && game.winner > 2 && game.winner !== 0) {
      await enterWinner({ page }, matchId, game.winner, logger);
    }
  }

  // Validation step: Check and refill any empty player inputs
  logger?.log("Validating all player inputs...");
  const processedGames = Array.from(gameAssemblyMap.keys());
  await validateAndRefillPlayerInputs({ page }, processedGames, logger);
}

/**
 * Validates all player inputs and refills any that are empty (value of 0)
 * @param page Puppeteer page object
 * @param games Array of games to validate
 * @param logger Logger instance for debugging
 */
async function validateAndRefillPlayerInputs(
  pupeteer: {
    page: Page;
  },
  games: Game[],
  logger?: Logger
): Promise<void> {
  const { page } = pupeteer;
  logger.verbose(`validate player inputs`);
  try {
    logger?.log("Starting player input validation...");

    // Get all games that have visualCode (matchId)
    const gamesWithMatchId = games.filter((game) => game.visualCode);

    for (const game of gamesWithMatchId) {
      const matchId = game.visualCode;
      logger?.debug(`Validating player inputs for game ${game.order} with matchId: ${matchId}`);

      // Check all player positions for this game
      const playerPositions = ["t1p1", "t1p2", "t2p1", "t2p2"];

      for (const position of playerPositions) {
        const selectorId = `match_${matchId}_${position}`;

        try {
          // Check if the selector exists and get its value
          const selector = await page.$(`#${selectorId}`);
          if (!selector) {
            logger?.warn(`Selector #${selectorId} not found for game ${game.order}`);
            continue;
          }

          const selectedValue = await page.evaluate((el) => {
            const select = el as HTMLSelectElement;
            return select.value;
          }, selector);

          logger?.debug(`Selector #${selectorId} has value: "${selectedValue}"`);

          // If the value is "0" (empty), try to refill it
          if (selectedValue === "0") {
            logger?.warn(`Empty player input detected for ${selectorId}, attempting to refill...`);

            // Find the player for this position
            const player = game.players?.find((p) => {
              const membership = p.GamePlayerMembership;
              if (position === "t1p1") return membership.team === 1 && membership.player === 1;
              if (position === "t1p2") return membership.team === 1 && membership.player === 2;
              if (position === "t2p1") return membership.team === 2 && membership.player === 1;
              if (position === "t2p2") return membership.team === 2 && membership.player === 2;
              return false;
            });

            if (player && player.memberId) {
              logger?.debug(
                `Refilling ${position} with player ${player.memberId} (${player.fullName})`
              );
              await selectPlayer(
                { page },
                player.memberId,
                position as "t1p1" | "t1p2" | "t2p1" | "t2p2",
                matchId,
                logger
              );

              // Wait a moment and verify the refill worked
              await new Promise((resolve) => setTimeout(resolve, 1000));
              const newValue = await page.evaluate((el) => {
                const select = el as HTMLSelectElement;
                return select.value;
              }, selector);

              if (newValue !== "0") {
                logger?.debug(`Successfully refilled ${selectorId} with value: "${newValue}"`);
              } else {
                logger?.error(`Failed to refill ${selectorId}, still has value "0"`);
              }
            } else {
              logger?.error(`No player found for position ${position} in game ${game.order}`);
            }
          }
        } catch (error) {
          logger?.error(`Error validating selector #${selectorId}:`, error);
        }
      }
    }

    logger?.log("Player input validation completed");
  } catch (error) {
    logger?.error("Error during player input validation:", error);
  }
}
