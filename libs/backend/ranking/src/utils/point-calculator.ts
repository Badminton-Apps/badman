import { RankingSystem, Game, Player } from '@badman/backend-database';
import { GameType } from '@badman/utils';

export class PointCalculator {
  constructor(private _type: RankingSystem) {}

  public getPointsForGame(
    game: Game,
    player1Team1: Player,
    player1Team2: Player,
    player2Team1: Player,
    player2Team2: Player
  ) {
    const points = {
      player1Team1Points: null,
      player2Team1Points: null,
      player1Team2Points: null,
      player2Team2Points: null,
      differenceInLevel: 0,
    } as {
      player1Team1Points: number | null;
      player2Team1Points: number | null;
      player1Team2Points: number | null;
      player2Team2Points: number | null;
      differenceInLevel: number ;
    };

    let levelP1T1 = this._type.amountOfLevels;
    let levelP2T1 = this._type.amountOfLevels;
    let levelP1T2 = this._type.amountOfLevels;
    let levelP2T2 = this._type.amountOfLevels;

    // Get rankings
    const maxRanking = {
      single: this._type.amountOfLevels,
      mix: this._type.amountOfLevels,
      double: this._type.amountOfLevels,
    };

    const rankingPlayer1Team1 =
      player1Team1.rankingLastPlaces?.[0] ?? maxRanking;
    const rankingPlayer2Team1 =
      player2Team1.rankingLastPlaces?.[0] ?? maxRanking;
    const rankingPlayer1Team2 =
      player1Team2.rankingLastPlaces?.[0] ?? maxRanking;
    const rankingPlayer2Team2 =
      player2Team2.rankingLastPlaces?.[0] ?? maxRanking;

    let pointsFrom: 'single' | 'mix' | 'double' | undefined = undefined;

    switch (game.gameType) {
      case GameType.S:
        pointsFrom = 'single';
        break;
      case GameType.D:
        pointsFrom = 'double';
        break;
      case GameType.MX:
        pointsFrom = 'mix';
        break;
    }

    if (pointsFrom === undefined) {
      throw new Error('No pointsFrom');
    }

    if (rankingPlayer1Team2) {
      levelP1T2 = parseInt(`${rankingPlayer1Team2[pointsFrom]}`, 10);
    }
    if (rankingPlayer2Team2) {
      levelP2T2 = parseInt(`${rankingPlayer2Team2[pointsFrom]}`, 10);
    }
    if (rankingPlayer1Team1) {
      levelP1T1 = parseInt(`${rankingPlayer1Team1[pointsFrom]}`, 10);
    }
    if (rankingPlayer2Team1) {
      levelP2T1 = parseInt(`${rankingPlayer2Team1[pointsFrom]}`, 10);
    }

    if (game.gameType === GameType.S) {
      if (game.winner === 1) {
        points.player1Team1Points = this._getWinningPoints(levelP1T2);
        points.player1Team2Points = 0;

        // Store the difference in levels
        points.differenceInLevel = levelP1T1 - levelP1T2;
      } else {
        // If you win against someone worse then you it doesn't count
        points.player1Team2Points = this._getWinningPoints(levelP1T1);
        points.player1Team1Points = 0;

        // Store the difference in levels
        points.differenceInLevel = levelP1T2 - levelP1T1;
      }
    } else {
      if (game.winner === 1) {
        const wonPoints = Math.round(
          (this._getWinningPoints(levelP1T2) +
            this._getWinningPoints(levelP2T2)) /
            2
        );
        points.player1Team1Points = wonPoints;
        points.player2Team1Points = wonPoints;
        points.player1Team2Points = 0;
        points.player2Team2Points = 0;

        // Store the difference in levels
        points.differenceInLevel =
          (levelP1T1 + levelP2T1 - (levelP1T2 + levelP2T2)) / 2;
      } else {
        const wonPoints = Math.round(
          (this._getWinningPoints(levelP1T1) +
            this._getWinningPoints(levelP2T1)) /
            2
        );
        points.player1Team2Points = wonPoints;
        points.player2Team2Points = wonPoints;
        points.player1Team1Points = 0;
        points.player2Team1Points = 0;

        // Store the difference in levels
        points.differenceInLevel =
          (levelP1T2 + levelP2T2 - (levelP1T1 + levelP2T1)) / 2;
      }
    }

    return points;
  }

  private _getWinningPoints(level: number): number {
    const index = this._type.pointsWhenWinningAgainst.length - level;
    return Math.round(this._type.pointsWhenWinningAgainst[index]);
  }
}
