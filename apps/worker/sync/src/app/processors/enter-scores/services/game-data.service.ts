import { Injectable, Logger } from "@nestjs/common";
import { Game } from "@badman/backend-database";
import { Transaction } from "sequelize";
import { SubEventTypeEnum } from "@badman/utils";

@Injectable()
export class GameDataService {
  private readonly logger = new Logger(GameDataService.name);

  async saveGameVisualCode(
    game: Game,
    visualCode: string,
    transaction?: Transaction
  ): Promise<void> {
    if (!transaction || !game.id) {
      return;
    }

    game.visualCode = visualCode;
    await game.save({ transaction });
  }

  async fixMixedDoublesPlayerOrder(
    game: Game,
    teamType: SubEventTypeEnum,
    assemblyPosition: string,
    transaction?: Transaction
  ): Promise<void> {
    // Only fix MX doubles
    if (teamType !== SubEventTypeEnum.MX || !assemblyPosition.startsWith("double")) {
      return;
    }

    if (!game.players || game.players.length !== 4) {
      return;
    }

    // Get players by team and position
    const players = this.getPlayersByPosition(game);

    const needsTeam1Fix = this.checkTeamNeedsGenderFix(players.t1p1, players.t1p2, "Team 1");
    const needsTeam2Fix = this.checkTeamNeedsGenderFix(players.t2p1, players.t2p2, "Team 2");

    // Fix teams if needed
    if (needsTeam1Fix && transaction) {
      await this.swapPlayerPositions(players.t1p1!, players.t1p2!, transaction);
    }

    if (needsTeam2Fix && transaction) {
      await this.swapPlayerPositions(players.t2p1!, players.t2p2!, transaction);
    }
  }

  private getPlayersByPosition(game: Game) {
    return {
      t1p1: game.players?.find(
        (p) => p.GamePlayerMembership.team === 1 && p.GamePlayerMembership.player === 1
      ),
      t1p2: game.players?.find(
        (p) => p.GamePlayerMembership.team === 1 && p.GamePlayerMembership.player === 2
      ),
      t2p1: game.players?.find(
        (p) => p.GamePlayerMembership.team === 2 && p.GamePlayerMembership.player === 1
      ),
      t2p2: game.players?.find(
        (p) => p.GamePlayerMembership.team === 2 && p.GamePlayerMembership.player === 2
      ),
    };
  }

  private checkTeamNeedsGenderFix(player1: any, player2: any, teamName: string): boolean {
    if (!player1 || !player2) return false;

    if (player1.gender === "F" && player2.gender === "M") {
      return true;
    } else if (player1.gender === "M" && player2.gender === "F") {
      return false;
    } else {
      return false;
    }
  }

  private async swapPlayerPositions(
    player1: any,
    player2: any,
    transaction: Transaction
  ): Promise<void> {
    this.logger.log(
      `Swapping player positions: ${player1.fullName}(${player1.gender}) <-> ${player2.fullName}(${player2.gender})`
    );

    // Swap positions in database
    await player1.GamePlayerMembership.update({ player: 2 }, { transaction });
    await player2.GamePlayerMembership.update({ player: 1 }, { transaction });

    // Update in-memory objects
    player1.GamePlayerMembership.player = 2;
    player2.GamePlayerMembership.player = 1;
  }

  getGameScores(game: Game): { set: number; scores: string }[] {
    const scores: { set: number; scores: string }[] = [];

    // Add set 1 if valid
    if (this.isValidScore(game.set1Team1, game.set1Team2)) {
      scores.push({ set: 1, scores: `${game.set1Team1}-${game.set1Team2}` });
    }

    // Add set 2 if valid
    if (this.isValidScore(game.set2Team1, game.set2Team2)) {
      scores.push({ set: 2, scores: `${game.set2Team1}-${game.set2Team2}` });
    }

    // Add set 3 if valid
    if (this.isValidScore(game.set3Team1, game.set3Team2)) {
      scores.push({ set: 3, scores: `${game.set3Team1}-${game.set3Team2}` });
    }

    return scores;
  }

  private isValidScore(team1Score: number | null, team2Score: number | null): boolean {
    return team1Score != null && team2Score != null && !(team1Score === 0 && team2Score === 0);
  }

  hasValidWinner(game: Game): boolean {
    return !!(game.winner && game.winner > 2 && game.winner !== 0);
  }

  getPlayersForGame(game: Game): {
    t1p1?: any;
    t1p2?: any;
    t2p1?: any;
    t2p2?: any;
  } {
    return this.getPlayersByPosition(game);
  }
}
