import { Game } from "@badman/backend-database";
import { Logger } from "@nestjs/common";
import { SubEventTypeEnum } from "@badman/utils";
import { getAssemblyPositionsInOrder } from "./assemblyPositions";

/**
 * Match games to assembly positions based on player assignments
 * @param games Array of games to match
 * @param assemblies Array of assembly records containing player assignments
 * @param teamType The team type (M, F, MX, NATIONAL)
 * @param encounter The encounter object with home/away team references
 * @param logger Logger instance for debugging
 * @returns Map of games with their assembly positions and game types
 */
export function matchGamesToAssembly(
  games: Game[],
  assemblies: any[],
  teamType: SubEventTypeEnum,
  encounter: any,
  logger?: Logger
): Map<Game, { assemblyPosition: string; gameType: string }> {
  logger?.debug(`Matching ${games.length} games to assembly for teamType: ${teamType}`);

  const gameAssemblyMap = new Map<Game, { assemblyPosition: string; gameType: string }>();

  if (!assemblies || assemblies.length === 0) {
    logger?.warn("No assemblies found, cannot match games to assembly");
    return gameAssemblyMap;
  }

  // Find the assembly for the home team (the team with the matching type)
  const homeTeamAssembly = assemblies.find((assembly) => assembly.teamId === encounter.home?.id);
  const awayTeamAssembly = assemblies.find((assembly) => assembly.teamId === encounter.away?.id);

  logger?.debug("Home team assembly:", homeTeamAssembly?.id, "Team ID:", encounter.home?.id);
  logger?.debug("Away team assembly:", awayTeamAssembly?.id, "Team ID:", encounter.away?.id);

  const homeAssemblyData = homeTeamAssembly?.assembly;
  const awayAssemblyData = awayTeamAssembly?.assembly;

  if (!homeAssemblyData || !awayAssemblyData) {
    logger?.warn("Missing assembly data - Home:", !!homeAssemblyData, "Away:", !!awayAssemblyData);
    return gameAssemblyMap;
  }

  logger?.debug("Home assembly data:", homeAssemblyData);
  logger?.debug("Away assembly data:", awayAssemblyData);

  // Get assembly positions in the correct order for this team type
  const orderedPositions = getAssemblyPositionsInOrder(teamType);

  // Define assembly positions and their corresponding game types based on team type
  const assemblyPositions = orderedPositions.map((position) => {
    let gameType: string;

    if (teamType === SubEventTypeEnum.MX) {
      // For MX teams, all games are mixed doubles
      gameType = "MX";
    } else {
      // For M and F teams, singles are S, doubles are D
      gameType = position.startsWith("single") ? "S" : "D";
    }

    return { position, gameType };
  });

  // Keep track of already matched games to prevent double-matching
  const matchedGameIds = new Set<string>();

  // Match games to assembly positions based on players from both teams
  for (const { position, gameType } of assemblyPositions) {
    const homePlayerIds = homeAssemblyData[position];
    const awayPlayerIds = awayAssemblyData[position];

    if (!homePlayerIds || !awayPlayerIds) {
      logger?.debug(
        `Missing players for ${position} - Home: ${!!homePlayerIds}, Away: ${!!awayPlayerIds}`
      );
      continue;
    }

    // Convert to arrays if they're not already (doubles are arrays, singles are strings)
    const homeIds = Array.isArray(homePlayerIds) ? homePlayerIds : [homePlayerIds];
    const awayIds = Array.isArray(awayPlayerIds) ? awayPlayerIds : [awayPlayerIds];

    // Combine both team's players for this position
    const allPositionPlayerIds = [...homeIds, ...awayIds];

    logger?.debug(`Looking for game with players for ${position}:`, {
      home: homeIds,
      away: awayIds,
      combined: allPositionPlayerIds,
    });

    // Find the game that matches these players (and hasn't been matched yet)
    const matchingGame = games.find((game) => {
      if (!game.players || game.players.length === 0) {
        logger?.debug(`Game ${game.id} has no players, skipping`);
        return false;
      }

      // Skip if this game was already matched to another position
      if (matchedGameIds.has(game.id)) {
        logger?.debug(`Game ${game.id} already matched, skipping`);
        return false;
      }

      // Filter out players with no memberId or with "unknown" in their memberId
      const validPlayers = game.players.filter(
        (p) => p.memberId && !p.memberId.toString().toLowerCase().includes("unknown")
      );
      const gamePlayerIds = validPlayers.map((p) => p.id).filter(Boolean);

      logger?.debug(`Checking game ${game.id} for ${position}:`, {
        gamePlayerIds,
        assemblyPlayerIds: allPositionPlayerIds,
        gamePlayerCount: gamePlayerIds.length,
        assemblyPlayerCount: allPositionPlayerIds.length,
      });

      // Check if this game matches the expected players for this position
      let isMatch = false;

      if (position.startsWith("single")) {
        // For singles: game should contain exactly 2 players (1 from home + 1 from away)
        isMatch =
          allPositionPlayerIds.every((playerId) => gamePlayerIds.includes(playerId)) &&
          gamePlayerIds.length === 2 &&
          allPositionPlayerIds.length === 2;
      } else {
        // For doubles: game should contain exactly 4 players (2 from home + 2 from away)
        isMatch =
          allPositionPlayerIds.every((playerId) => gamePlayerIds.includes(playerId)) &&
          gamePlayerIds.length === 4 &&
          allPositionPlayerIds.length === 4;
      }

      if (isMatch) {
        logger?.debug(`Found matching game ${game.id} for ${position}`, {
          gamePlayerIds,
          assemblyPlayerIds: allPositionPlayerIds,
          matchType: position.startsWith("single") ? "singles" : "doubles",
        });
        return true;
      }

      return false;
    });

    if (matchingGame) {
      gameAssemblyMap.set(matchingGame, { assemblyPosition: position, gameType });
      matchedGameIds.add(matchingGame.id); // Mark this game as matched
      logger?.debug(`Matched game ${matchingGame.id} to ${position} (${gameType})`);
    } else {
      logger?.warn(`No matching game found for ${position} with players:`, allPositionPlayerIds);
    }
  }

  logger?.log(
    `Successfully matched ${gameAssemblyMap.size}/${games.length} games to assembly positions`
  );
  return gameAssemblyMap;
}
