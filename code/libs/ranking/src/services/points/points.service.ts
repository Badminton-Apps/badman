import {
  DrawCompetition,
  DrawTournament,
  EncounterCompetition,
  Game,
  GamePlayerMembership,
  GameType,
  Player,
  RankingGroup,
  RankingPlace,
  RankingPoint,
  RankingSystem,
} from '@badman/api/database';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import moment from 'moment';
import { Op, Transaction } from 'sequelize';

@Injectable()
export class PointsService {
  private readonly _logger = new Logger(PointsService.name);

  public async createRankingPointsForPeriod({
    system,
    calcDate,
    options,
  }: {
    system: RankingSystem;
    calcDate?: Date | string;
    options?: {
      createRankingPoints?: boolean;
      transaction?: Transaction;
    };
  }) {
    // Options
    const { transaction } = options ?? {};

    if (!system) {
      throw new NotFoundException(`${RankingSystem.name}`);
    }

    const start = moment(calcDate)
      .subtract(system.periodAmount, system.periodUnit)
      .toDate();
    const stop = moment(calcDate).toDate();

    this._logger.log(`Calculatting points for ${system.name}`);

    const where = {
      systemId: system.id,
      rankingDate: {
        [Op.between]: [start.toISOString(), stop.toISOString()],
      },
    };

    const pointCount = await RankingPoint.count({ where, transaction });
    if (pointCount > 0) {
      const deleted = await RankingPoint.destroy({ where, transaction });
      this._logger.verbose(
        `Truncated ${deleted} RankingPoint for system ${
          where.systemId
        } and between ${start.toISOString()} and ${stop.toISOString()}`
      );
    }

    const groups = await system.getRankingGroups();

    const { subEventsC, subEventsT } = await this._getSubEvents(
      groups,
      options?.transaction
    );

    this._logger.debug(
      `SubEventsC: ${subEventsC.length}, SubEventsT: ${subEventsT.length}`
    );

    const games = await this._getGames(
      subEventsC,
      subEventsT,
      {
        start,
        stop,
      },
      options
    );

    // Calculate ranking points per game
    const total = games.length;
    let done = 0;

    this._logger.debug(`Calculating points for ${total} games`);

    for (const game of games) {
      await this.createRankingPointforGame(system, game, options);
      done++;

      if (done % 100 === 0) {
        this._logger.debug(
          `Calulating point: ${done}/${total} (${((done / total) * 100).toFixed(
            2
          )}%)`
        );
      }
    }
  }

  public async createRankingPointforGame(
    system: RankingSystem,
    game: Game,
    options?: {
      createRankingPoints?: boolean;
      transaction?: Transaction;
    }
  ): Promise<RankingPoint[]> {
    const { createRankingPoints = true, transaction } = options ?? {};

    const rankings: RankingPoint[] = [];
    // ignore these types
    if (game.winner === 0 || game.winner === 7 || game.winner === 6) {
      return;
    }

    // ignore WO's
    if (
      (game.set1Team1 ?? null) === null &&
      (game.set1Team2 ?? null) === null
    ) {
      return;
    }

    const gamePlayesr = (await game.getPlayers({
      attributes: ['id', 'gender'],
      include: [
        {
          model: RankingPlace,
          attributes: ['single', 'double', 'mix', 'rankingDate', 'systemId'],
          required: false,
          where: {
            systemId: system.id,
            rankingDate: {
              [Op.lte]: game.playedAt,
            },
          },
          order: [['rankingDate', 'DESC']],
          limit: 1,
        },
      ],
      transaction,
    })) as (Player & { GamePlayerMembership: GamePlayerMembership })[];

    const player1Team1 = gamePlayesr.find(
      (player) =>
        player.GamePlayerMembership.team === 1 &&
        player.GamePlayerMembership.player === 1
    );
    const player2Team1 = gamePlayesr.find(
      (player) =>
        player.GamePlayerMembership.team === 1 &&
        player.GamePlayerMembership.player === 2
    );
    const player1Team2 = gamePlayesr.find(
      (player) =>
        player.GamePlayerMembership.team === 2 &&
        player.GamePlayerMembership.player === 1
    );
    const player2Team2 = gamePlayesr.find(
      (player) =>
        player.GamePlayerMembership.team === 2 &&
        player.GamePlayerMembership.player === 2
    );

    const {
      player1Team1Points,
      player2Team1Points,
      player1Team2Points,
      player2Team2Points,
      differenceInLevel,
    } = this._getPointsForGame(
      game,
      player1Team1,
      player1Team2,
      player2Team1,
      player2Team2,
      system
    );

    if (player1Team1 && player1Team1.id && player1Team1Points != null) {
      rankings.push(
        new RankingPoint({
          points: player1Team1Points,
          systemId: system.id,
          playerId: player1Team1.id,
          gameId: game.id,
          rankingDate: game.playedAt,
          differenceInLevel: player1Team1Points === 0 ? differenceInLevel : 0,
        })
      );
    }
    if (player1Team2 && player1Team2.id && player1Team2Points != null) {
      rankings.push(
        new RankingPoint({
          points: player1Team2Points,
          systemId: system.id,
          playerId: player1Team2.id,
          gameId: game.id,
          rankingDate: game.playedAt,
          differenceInLevel: player1Team2Points === 0 ? differenceInLevel : 0,
        })
      );
    }

    if (player2Team1 && player2Team1.id && player2Team1Points != null) {
      rankings.push(
        new RankingPoint({
          points: player2Team1Points,
          systemId: system.id,
          playerId: player2Team1.id,
          gameId: game.id,
          rankingDate: game.playedAt,
          differenceInLevel: player2Team1Points === 0 ? differenceInLevel : 0,
        })
      );
    }

    if (player2Team2 && player2Team2.id && player2Team2Points != null) {
      rankings.push(
        new RankingPoint({
          points: player2Team2Points,
          systemId: system.id,
          playerId: player2Team2.id,
          gameId: game.id,
          rankingDate: game.playedAt,
          differenceInLevel: player2Team2Points === 0 ? differenceInLevel : 0,
        })
      );
    }

    if (rankings.length > 0 && createRankingPoints) {
      await RankingPoint.bulkCreate(
        rankings.map((r) => r.toJSON()),
        {
          returning: false,
          transaction: options?.transaction,
        }
      );
    }

    return rankings;
  }

  private async _getGames(
    subEventsC: string[],
    subEventsT: string[],
    { start, stop }: { start: Date; stop: Date },
    options?: { transaction?: Transaction }
  ) {
    const { transaction } = options ?? {};

    this._logger.debug(
      `Getting games between ${start.toISOString()} and ${stop.toISOString()}`
    );

    const where = {
      playedAt: {
        [Op.between]: [start, stop],
      },
    };

    const gamesC = await Game.findAll({
      where,
      attributes: [
        'id',
        'playedAt',
        'gameType',
        'winner',
        'set1Team1',
        'set1Team2',
      ],
      include: [
        { model: Player, attributes: ['id'] },
        {
          required: true,
          model: EncounterCompetition,
          attributes: ['id'],
          include: [
            {
              model: DrawCompetition,
              required: true,
              attributes: ['id'],
              where: {
                subeventId: subEventsC,
              },
            },
          ],
        },
      ],
      transaction,
    });

    const gamesT = await Game.findAll({
      where,
      attributes: [
        'id',
        'playedAt',
        'gameType',
        'winner',
        'set1Team1',
        'set1Team2',
      ],
      include: [
        { model: Player, attributes: ['id'] },
        {
          model: DrawTournament,
          attributes: ['id'],
          required: true,
          where: {
            subeventId: subEventsT,
          },
        },
      ],
      transaction,
    });

    return [...gamesC, ...gamesT];
  }

  private async _getSubEvents(
    groups: RankingGroup[],
    transaction?: Transaction
  ) {
    let subEventsC: string[] = [];
    let subEventsT: string[] = [];
    for (const group of groups) {
      const c = await group.getSubEventCompetitions({
        transaction,
        attributes: ['id'],
      });

      if ((c?.length ?? 0) > 0) {
        subEventsC = subEventsC.concat(c?.map((s) => s.id));
      }

      const t = await group.getSubEventTournaments({
        transaction,
        attributes: ['id'],
      });
      if ((t?.length ?? 0) > 0) {
        subEventsT = subEventsT.concat(t?.map((s) => s.id));
      }
    }

    return { subEventsC, subEventsT };
  }

  private _getPointsForGame(
    game: Game,
    player1Team1: Player,
    player1Team2: Player,
    player2Team1: Player,
    player2Team2: Player,
    system: RankingSystem
  ) {
    const points = {
      player1Team1Points: null,
      player2Team1Points: null,
      player1Team2Points: null,
      player2Team2Points: null,
      differenceInLevel: 0,
    };

    let levelP1T1 = system.amountOfLevels;
    let levelP2T1 = system.amountOfLevels;
    let levelP1T2 = system.amountOfLevels;
    let levelP2T2 = system.amountOfLevels;

    // Get rankings
    const maxRanking = {
      single: system.amountOfLevels,
      mix: system.amountOfLevels,
      double: system.amountOfLevels,
    };

    const rankingPlayer1Team1 = player1Team1?.rankingPlaces?.[0] ?? maxRanking;
    const rankingPlayer2Team1 = player2Team1?.rankingPlaces?.[0] ?? maxRanking;
    const rankingPlayer1Team2 = player1Team2?.rankingPlaces?.[0] ?? maxRanking;
    const rankingPlayer2Team2 = player2Team2?.rankingPlaces?.[0] ?? maxRanking;

    let pointsFrom: string;

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
    if (rankingPlayer1Team2) {
      levelP1T2 = parseInt(rankingPlayer1Team2[pointsFrom], 10);
    }
    if (rankingPlayer2Team2) {
      levelP2T2 = parseInt(rankingPlayer2Team2[pointsFrom], 10);
    }
    if (rankingPlayer1Team1) {
      levelP1T1 = parseInt(rankingPlayer1Team1[pointsFrom], 10);
    }
    if (rankingPlayer2Team1) {
      levelP2T1 = parseInt(rankingPlayer2Team1[pointsFrom], 10);
    }

    if (game.gameType === GameType.S) {
      if (game.winner === 1) {
        points.player1Team1Points = this._getWinningPoints(system, levelP1T2);
        points.player1Team2Points = 0;

        // Store the difference in levels
        points.differenceInLevel = levelP1T1 - levelP1T2;
      } else {
        // If you win against someone worse then you it doesn't count
        points.player1Team2Points = this._getWinningPoints(system, levelP1T1);
        points.player1Team1Points = 0;

        // Store the difference in levels
        points.differenceInLevel = levelP1T2 - levelP1T1;
      }
    } else {
      if (game.winner === 1) {
        const wonPoints = Math.round(
          (this._getWinningPoints(system, levelP1T2) +
            this._getWinningPoints(system, levelP2T2)) /
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
          (this._getWinningPoints(system, levelP1T1) +
            this._getWinningPoints(system, levelP2T1)) /
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

  private _getWinningPoints(system: RankingSystem, level: number): number {
    const index = system.pointsWhenWinningAgainst.length - level;
    return Math.round(system.pointsWhenWinningAgainst[index]);
  }
}
