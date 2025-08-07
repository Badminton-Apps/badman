import { Game } from "@badman/backend-database";
import { Logger } from "@nestjs/common";
import { Page } from "puppeteer";
import { selectPlayer } from "./selectPlayer";
import { enterScores } from "./enterScores";
import { Transaction } from "sequelize";

/**
 * Finds the first available game section on the page based on game type
 * @param page Puppeteer page object
 * @param gameType The game type ('S', 'D', or 'MX')
 * @param timeout Timeout for element selection
 * @param logger Logger instance for debugging
 * @returns The matchId of the first available game section, or null if not found
 */
async function findFirstAvailableGameSection(
  pupeteer: {
    page: Page;
    timeout?: number;
  } = {
    page: null,
    timeout: 5000,
  },
  args: {
    gameType: string;
    logger?: Logger;
  }
): Promise<string | null> {
  const { page } = pupeteer;
  const { gameType, logger } = args || {};
  try {
    logger?.verbose("findFirstAvailableGameSection");
    logger?.debug(`Finding available game section for gameType: ${gameType}`);

    // Determine the submatch row type based on game type
    let submatchRowType: string;
    if (gameType === "S") {
      submatchRowType = "single";
    } else if (gameType === "D" || gameType === "MX") {
      submatchRowType = "double";
    } else {
      throw new Error(`Unsupported game type: ${gameType}`);
    }

    logger?.debug(`Looking for submatch rows with type: ${submatchRowType}`);

    // Find all submatch row elements of the specified type
    const submatchRows = await page.$$(`tr.submatchrow_${submatchRowType}`);

    logger?.debug(`Found ${submatchRows.length} submatch rows of type ${submatchRowType}`);

    if (submatchRows.length === 0) {
      logger?.warn(`No submatch rows found for type ${submatchRowType}`);
      return null;
    }

    // Check each submatch row to find the first one with empty player selections
    for (let rowIndex = 0; rowIndex < submatchRows.length; rowIndex++) {
      const submatchRow = submatchRows[rowIndex];
      logger?.debug(`Checking submatch row ${rowIndex + 1}/${submatchRows.length}`);

      // Look for all player selectors within this submatch row
      let playerSelectorPattern: string;
      if (gameType === "S") {
        // Singles games only have t1p1 and t2p1
        playerSelectorPattern =
          'select[id^="match_"][id$="_t1p1"], select[id^="match_"][id$="_t2p1"]';
        logger?.debug(`Singles game: looking for t1p1 and t2p1 selectors`);
      } else {
        // Doubles/mixed games have all four player positions
        playerSelectorPattern =
          'select[id^="match_"][id$="_t1p1"], select[id^="match_"][id$="_t1p2"], select[id^="match_"][id$="_t2p1"], select[id^="match_"][id$="_t2p2"]';
        logger?.debug(
          `Doubles/mixed game: looking for all four player selectors (t1p1, t1p2, t2p1, t2p2)`
        );
      }

      const playerSelectors = await submatchRow.$$(playerSelectorPattern);

      logger?.debug(`Found ${playerSelectors.length} player selectors in row ${rowIndex + 1}`);

      if (playerSelectors.length === 0) {
        logger?.debug(`No player selectors found in row ${rowIndex + 1}, trying next row`);
        continue; // No player selectors found, try next row
      }

      // Check if all player selectors in this row are empty (no selected value)
      let allSelectorsEmpty = true;
      let matchId: string | null = null;

      for (let selectorIndex = 0; selectorIndex < playerSelectors.length; selectorIndex++) {
        const selector = playerSelectors[selectorIndex];

        // Get the selector ID to extract matchId
        const selectorId = await page.evaluate((el) => el.id, selector);
        logger?.debug(`Checking selector ${selectorIndex + 1}: ${selectorId}`);

        const match = selectorId.match(/^match_(.+)_(t1p1|t1p2|t2p1|t2p2)$/);

        if (match && !matchId) {
          matchId = match[1]; // Store the matchId from the first selector
          logger?.debug(`Extracted matchId: ${matchId} from selector: ${selectorId}`);
        }

        // Check if this select element has no selected value
        const selectedValue = await page.evaluate((el) => {
          const select = el as HTMLSelectElement;
          return select.value;
        }, selector);

        logger?.debug(`Selector ${selectorId} has selected value: "${selectedValue}"`);

        // If any selector has a selected value other than "0", this row is not empty
        if (selectedValue && selectedValue !== "0") {
          logger?.debug(
            `Selector ${selectorId} is not empty (value: "${selectedValue}"), row ${rowIndex + 1} is not available`
          );
          allSelectorsEmpty = false;
          break;
        }
      }

      // If all selectors in this row are empty, we found our available section
      if (allSelectorsEmpty && matchId) {
        logger?.debug(
          `Found available game section with matchId: ${matchId} in row ${rowIndex + 1}`
        );
        return matchId;
      } else if (allSelectorsEmpty && !matchId) {
        logger?.warn(`Row ${rowIndex + 1} appears empty but no valid matchId could be extracted`);
      }
    }

    logger?.warn(`No empty game sections found for gameType: ${gameType}`);
    return null; // No empty game sections found
  } catch (error) {
    logger?.error(`Error finding available game section for gameType ${gameType}:`, error);
    return null;
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
    games: Game[];
    transaction: Transaction;
    logger?: Logger;
  }
) {
  const { page, timeout } = pupeteer;
  const { games, transaction, logger } = args || {};
  logger?.verbose("enterGames");

  if (!page) {
    throw new Error("No page provided");
  }

  const gamesWithVisualCodeFirst = games.sort((a, b) => {
    if (a.visualCode && !b.visualCode) return -1;
    if (!a.visualCode && b.visualCode) return 1;
    return 0;
  });

  logger?.log(`Entering games`, gamesWithVisualCodeFirst.length);
  for (const game of gamesWithVisualCodeFirst ?? []) {
    logger.verbose(`processing game ${game.id}`);
    let matchId: string;

    if (game?.visualCode) {
      // Use the visual code as matchId for games that have it
      matchId = game.visualCode;
      logger?.log(`Processing game ${game.order} with visualCode: ${matchId}`);
    } else {
      // Find the first available game section for games without visual code
      if (!game.gameType) {
        logger?.error(`Game ${game.order} has no visualCode and no gameType, skipping`);
        continue;
      }

      logger?.log(
        `Processing game ${game.order} without visualCode, finding available section for gameType: ${game.gameType}`
      );
      matchId = await findFirstAvailableGameSection(
        { page, timeout },
        { gameType: game.gameType, logger: logger }
      );

      if (!matchId) {
        logger?.error(
          `Could not find available game section for game ${game.order} with gameType ${game.gameType}, skipping`
        );
        continue;
      }

      logger?.debug(`Found available game section with matchId: ${matchId}`);

      // Save the found matchId to the game's visualCode for future reference
      game.visualCode = matchId;
      logger?.debug(`Saved matchId ${matchId} to game ${game.order} visualCode`);

      // Save to database if transaction is provided
      if (transaction && game.id) {
        try {
          await game.save({ transaction });
          logger?.debug(`Saved visualCode ${matchId} to database for game ${game.id}`);
        } catch (error) {
          logger?.error(`Failed to save visualCode to database for game ${game.id}:`, error);
          throw error;
        }
      }
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

    logger?.debug(`t1p2`, t1p2);
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
    logger?.debug(`t2p1`, t2p1);
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

    if (game.set1Team1 && game.set1Team2) {
      await enterScores({ page }, 1, `${game.set1Team1}-${game.set1Team2}`, matchId);
    }

    if (game.set2Team1 && game.set2Team2) {
      await enterScores({ page }, 2, `${game.set2Team1}-${game.set2Team2}`, matchId);
    }

    if (game.set3Team1 && game.set3Team2) {
      await enterScores({ page }, 3, `${game.set3Team1}-${game.set3Team2}`, matchId);
    }
  }

  // Validation step: Check and refill any empty player inputs
  logger?.log("Validating all player inputs...");
  await validateAndRefillPlayerInputs({ page }, gamesWithVisualCodeFirst, logger);
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
