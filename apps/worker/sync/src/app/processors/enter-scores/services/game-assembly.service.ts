import { Injectable, Logger } from "@nestjs/common";
import { Game } from "@badman/backend-database";
import { SubEventTypeEnum } from "@badman/utils";

export interface GameAssemblyMapping {
  assemblyPosition: string;
  gameType: string;
}

export interface AssemblyPositionConfig {
  [SubEventTypeEnum.M]: string[];
  [SubEventTypeEnum.F]: string[];
  [SubEventTypeEnum.MX]: string[];
}

@Injectable()
export class GameAssemblyService {
  private readonly logger = new Logger(GameAssemblyService.name);

  private readonly ASSEMBLY_POSITION_ORDER: AssemblyPositionConfig = {
    [SubEventTypeEnum.M]: [
      "double1",
      "double2",
      "double3",
      "double4",
      "single1",
      "single2",
      "single3",
      "single4",
    ],
    [SubEventTypeEnum.F]: [
      "double1",
      "double2",
      "double3",
      "double4",
      "single1",
      "single2",
      "single3",
      "single4",
    ],
    [SubEventTypeEnum.MX]: [
      "double1",
      "double2",
      "single1",
      "single3",
      "single2",
      "single4",
      "double3",
      "double4",
    ],
  };

  getAssemblyPositionsInOrder(teamType: SubEventTypeEnum): string[] {
    return this.ASSEMBLY_POSITION_ORDER[teamType] || [];
  }

  private getGameTypeForPosition(teamType: SubEventTypeEnum, position: string): string {
    if (teamType === SubEventTypeEnum.MX) {
      return "MX"; // All games in mixed are mixed doubles
    }
    return position.startsWith("single") ? "S" : "D";
  }

  matchGamesToAssembly(
    games: Game[],
    assemblies: any[],
    teamType: SubEventTypeEnum,
    encounter: any
  ): Map<Game, GameAssemblyMapping> {
    const gameAssemblyMap = new Map<Game, GameAssemblyMapping>();

    if (!assemblies || assemblies.length === 0) {
      return gameAssemblyMap;
    }

    // Find assemblies for both teams
    const homeTeamAssembly = assemblies.find((assembly) => assembly.teamId === encounter.home?.id);
    const awayTeamAssembly = assemblies.find((assembly) => assembly.teamId === encounter.away?.id);

    if (!homeTeamAssembly?.assembly || !awayTeamAssembly?.assembly) {
      return gameAssemblyMap;
    }

    const homeAssemblyData = homeTeamAssembly.assembly;
    const awayAssemblyData = awayTeamAssembly.assembly;
    const orderedPositions = this.getAssemblyPositionsInOrder(teamType);
    const matchedGameIds = new Set<string>();

    // Match games to assembly positions
    for (const position of orderedPositions) {
      const gameType = this.getGameTypeForPosition(teamType, position);
      const homePlayerIds = homeAssemblyData[position];
      const awayPlayerIds = awayAssemblyData[position];

      if (!homePlayerIds || !awayPlayerIds) {
        continue;
      }

      // Convert to arrays and combine
      const homeIds = Array.isArray(homePlayerIds) ? homePlayerIds : [homePlayerIds];
      const awayIds = Array.isArray(awayPlayerIds) ? awayPlayerIds : [awayPlayerIds];
      const allPositionPlayerIds = [...homeIds, ...awayIds];

      // Find matching game
      const matchingGame = this.findMatchingGame(
        games,
        allPositionPlayerIds,
        position,
        matchedGameIds
      );

      if (matchingGame) {
        gameAssemblyMap.set(matchingGame, { assemblyPosition: position, gameType });
        matchedGameIds.add(matchingGame.id);
      }
    }

    return gameAssemblyMap;
  }

  private findMatchingGame(
    games: Game[],
    allPositionPlayerIds: string[],
    position: string,
    matchedGameIds: Set<string>
  ): Game | null {
    return (
      games.find((game) => {
        if (!game.players || game.players.length === 0 || matchedGameIds.has(game.id)) {
          return false;
        }

        // Filter valid players and get their IDs
        const validPlayers = game.players.filter(
          (p) => p.memberId && !p.memberId.toString().toLowerCase().includes("unknown")
        );
        const gamePlayerIds = validPlayers.map((p) => p.id).filter(Boolean);

        // Check if this game matches the expected players
        const expectedPlayerCount = position.startsWith("single") ? 2 : 4;

        return (
          allPositionPlayerIds.every((playerId) => gamePlayerIds.includes(playerId)) &&
          gamePlayerIds.length === expectedPlayerCount &&
          allPositionPlayerIds.length === expectedPlayerCount
        );
      }) || null
    );
  }
}
