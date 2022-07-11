import { Logger } from '@nestjs/common';
import moment, { Moment } from 'moment';
import { Op, Transaction } from 'sequelize';
import {
  DrawCompetition,
  DrawTournament,
  EncounterCompetition,
  Game,
  Player,
  RankingPlace,
  RankingLastPlace,
  RankingPoint,
  RankingSystem,
  GameType,
  GamePlayerMembership,
} from '@badman/api/database';
import { PointCalculator } from './point-calculator';

export class RankingCalc {
  periods: RankingPeriod[];
  protected pointCalculator: PointCalculator;

  constructor(public rankingType: RankingSystem, protected _logger: Logger) {}

  async beforeCalculationAsync(start?: Moment) {
    const systemId = this.rankingType.id;
    const startingDate =
      start ?? moment(this.rankingType.caluclationIntervalLastUpdate);

    const where = {
      systemId,
      rankingDate: {
        [Op.gte]: startingDate.toDate(),
      },
    };

    try {
      const placeCount = await RankingPlace.count({ where });

      if (placeCount > 0) {
        const deleted = await RankingPlace.destroy({ where });
        this._logger.verbose(
          `Truncated ${deleted} RankingPlace for system ${
            where.systemId
          } and after ${startingDate.toISOString()}`
        );
      }

      // const newWhere = {
      //   systemId: systemId,
      //   rankingDate: {
      //     [Op.gte]: startingDate.toDate(),
      //   },
      // };
      // const placeLastCount = await RankingLastPlace.count({ where: newWhere });

      // if (placeLastCount > 0) {
      //   const deleted = await RankingLastPlace.destroy({ where: newWhere });
      //   this._logger.verbose(
      //     `Truncated ${deleted} RankingLastPlace for system ${
      //       where.systemId
      //     } and after ${startingDate.toISOString()}`
      //   );
      // }

      const pointCount = await RankingPoint.count({ where });
      if (pointCount > 0) {
        const deleted = await RankingPoint.destroy({ where });
        this._logger.verbose(
          `Truncated ${deleted} RankingPoint for system ${
            where.systemId
          } and after ${startingDate.toISOString()}`
        );
      }

      this.rankingType.runCurrently = true;
      this.rankingType.runDate = new Date();
      await this.rankingType.save();
    } catch (er) {
      this._logger.error('Something went wrong clearing the DB', er);
      throw er;
    }
  }

  async calculateAsync(stop: Moment, start?: Moment) {
    if (start) {
      this.rankingType.caluclationIntervalLastUpdate = start.toDate();
      this.rankingType.updateIntervalAmountLastUpdate = start.toDate();
      this.rankingType.save();
    }

    let lastPeriod = moment(this.rankingType.caluclationIntervalLastUpdate);
    const lastUpdateRanking = moment(
      this.rankingType.updateIntervalAmountLastUpdate
    );

    this._logger.verbose('Config', {
      caluclationIntervalLastUpdate:
        this.rankingType.caluclationIntervalLastUpdate,
      updateIntervalAmountLastUpdate:
        this.rankingType.updateIntervalAmountLastUpdate,
      updateInterval: this.rankingType.updateInterval,
      period: this.rankingType.period,
      calculationInterval: this.rankingType.calculationInterval,
      stop,
      start,
    });

    while (lastPeriod.isSameOrBefore(stop)) {
      // get the start / stop for the period
      // note: this is probably different then the calculation interval
      const periodStart = lastPeriod
        .clone()
        .subtract(this.rankingType.period.amount, this.rankingType.period.unit)
        .toDate();
      const periodStop = lastPeriod.toDate();
      const updateRankings = lastUpdateRanking.isSameOrBefore(lastPeriod);

      await this.calculatePeriodAsync(
        periodStart,
        periodStop,
        updateRankings,
        {}
      );

      if (updateRankings) {
        this.rankingType.updateIntervalAmountLastUpdate =
          lastUpdateRanking.toDate();
        lastUpdateRanking.add(
          this.rankingType.updateInterval.amount,
          this.rankingType.updateInterval.unit
        );
      }

      this.rankingType.caluclationIntervalLastUpdate = lastPeriod.toDate();

      // Forward the period we just did with the calculation interval
      lastPeriod = lastPeriod
        .clone()
        .add(
          this.rankingType.calculationInterval.amount,
          this.rankingType.calculationInterval.unit
        );
      await this.rankingType.save();
    }

    // await this.rankingType.save();

    // for (const { start, end } of this.periods) {
    //   await this.calculatePeriodAsync(start, end, first);

    //   first = false;
    // }
  }

  async calculatePeriodAsync(
    start: Date,
    end: Date,
    updateRankings: boolean,
    options: {
      transaction?: Transaction;
    }
  ) {
    options = {
      transaction: undefined,
      ...options,
    };

    this._logger.log(
      `Started Calcualting for period ${start.toDateString()} untill ${end.toDateString()}${
        updateRankings ? ', and updating rankings' : ''
      }`
    );
  }

  async afterCalculationAsync() {
    this.rankingType.runCurrently = false;
    this.rankingType.save();
  }

  public processGame(
    game: Game,
    players: Map<
      string,
      Player & { GamePlayerMembership: GamePlayerMembership }
    >,
    rankingDate?: Date
  ): RankingPoint[] {
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

    const player1Team1 = players.get(
      game.players.find(
        (player) =>
          player.GamePlayerMembership.team === 1 &&
          player.GamePlayerMembership.player === 1
      )?.id
    );
    const player2Team1 = players.get(
      game.players.find(
        (player) =>
          player.GamePlayerMembership.team === 1 &&
          player.GamePlayerMembership.player === 2
      )?.id
    );
    const player1Team2 = players.get(
      game.players.find(
        (player) =>
          player.GamePlayerMembership.team === 2 &&
          player.GamePlayerMembership.player === 1
      )?.id
    );
    const player2Team2 = players.get(
      game.players.find(
        (player) =>
          player.GamePlayerMembership.team === 2 &&
          player.GamePlayerMembership.player === 2
      )?.id
    );

    const {
      player1Team1Points,
      player2Team1Points,
      player1Team2Points,
      player2Team2Points,
      differenceInLevel,
    } = this.pointCalculator.getPointsForGame(
      game,
      player1Team1,
      player1Team2,
      player2Team1,
      player2Team2
    );

    if (player1Team1 && player1Team1.id && player1Team1Points != null) {
      rankings.push(
        new RankingPoint({
          points: player1Team1Points,
          systemId: this.rankingType.id,
          playerId: player1Team1.id,
          gameId: game.id,
          rankingDate: rankingDate ?? game.playedAt,
          differenceInLevel: player1Team1Points === 0 ? differenceInLevel : 0,
        })
      );
    }
    if (player1Team2 && player1Team2.id && player1Team2Points != null) {
      rankings.push(
        new RankingPoint({
          points: player1Team2Points,
          systemId: this.rankingType.id,
          playerId: player1Team2.id,
          gameId: game.id,
          rankingDate: rankingDate ?? game.playedAt,
          differenceInLevel: player1Team2Points === 0 ? differenceInLevel : 0,
        })
      );
    }

    if (player2Team1 && player2Team1.id && player2Team1Points != null) {
      rankings.push(
        new RankingPoint({
          points: player2Team1Points,
          systemId: this.rankingType.id,
          playerId: player2Team1.id,
          gameId: game.id,
          rankingDate: rankingDate ?? game.playedAt,
          differenceInLevel: player2Team1Points === 0 ? differenceInLevel : 0,
        })
      );
    }

    if (player2Team2 && player2Team2.id && player2Team2Points != null) {
      rankings.push(
        new RankingPoint({
          points: player2Team2Points,
          systemId: this.rankingType.id,
          playerId: player2Team2.id,
          gameId: game.id,
          rankingDate: rankingDate ?? game.playedAt,
          differenceInLevel: player2Team2Points === 0 ? differenceInLevel : 0,
        })
      );
    }

    return rankings;
  }

  protected protectRanking(
    newRanking: RankingPlace
    // highestRanking: { single: number; mix: number; double: number }
  ): RankingPlace {
    const highest = Math.min(
      newRanking.single,
      newRanking.double,
      newRanking.mix
    );

    if (newRanking.single - highest >= this.rankingType.maxDiffLevels) {
      newRanking.single = highest + this.rankingType.maxDiffLevels;
    }
    if (newRanking.double - highest >= this.rankingType.maxDiffLevels) {
      newRanking.double = highest + this.rankingType.maxDiffLevels;
    }
    if (newRanking.mix - highest >= this.rankingType.maxDiffLevels) {
      newRanking.mix = highest + this.rankingType.maxDiffLevels;
    }

    // if (newRanking.single - highestRanking.single > this.rankingType.maxDiffLevelsHighest) {
    //   newRanking.single = highestRanking.single + this.rankingType.maxDiffLevelsHighest;
    // }
    // if (newRanking.double - highestRanking.double > this.rankingType.maxDiffLevelsHighest) {
    //   newRanking.double = highestRanking.double + this.rankingType.maxDiffLevelsHighest;
    // }
    // if (newRanking.mix - highestRanking.mix > this.rankingType.maxDiffLevelsHighest) {
    //   newRanking.mix = highestRanking.mix + this.rankingType.maxDiffLevelsHighest;
    // }

    if (newRanking.single > this.rankingType.amountOfLevels) {
      newRanking.single = this.rankingType.amountOfLevels;
    }
    if (newRanking.double > this.rankingType.amountOfLevels) {
      newRanking.double = this.rankingType.amountOfLevels;
    }
    if (newRanking.mix > this.rankingType.amountOfLevels) {
      newRanking.mix = this.rankingType.amountOfLevels;
    }

    return newRanking;
  }

  protected async getGamesAsync(
    start: Date,
    end: Date,
    options?: { transaction?: Transaction; logger?: Logger }
  ): Promise<Game[]> {
    // Default options
    options = {
      transaction: undefined,
      ...options,
    };

    // Get Games
    this._logger.debug(
      `getGamesAsync for period ${start.toDateString()} - ${end.toDateString()}`
    );

    const where = {
      playedAt: {
        [Op.between]: [start, end],
      },
    };

    const groups = await this.rankingType.getRankingGroups({
      transaction: options.transaction,
    });

    const subEventsC: string[] = [];
    for (const group of groups) {
      const subEvents = await group.getSubEventCompetitions({
        transaction: options.transaction,
        attributes: ['id'],
      });

      if ((subEvents?.length ?? 0) > 0) {
        subEventsC.concat(subEvents?.map((s) => s.id));
      }
    }

    const subEventsT: string[] = [];
    for (const group of groups) {
      const subEvents = await group.getSubEventTournaments({
        transaction: options.transaction,
        attributes: ['id'],
      });
      if ((subEvents?.length ?? 0) > 0) {
        subEventsT.concat(subEvents?.map((s) => s.id));
      }
    }

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
      transaction: options?.transaction,
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
      transaction: options?.transaction,
    });

    const games = [...gamesC, ...gamesT];

    this._logger.debug(`Got ${games.length} games`);

    return games;
  }

  protected async getPlayersForGamesAsync(
    games: Game[],
    start: Date,
    end: Date,
    options: {
      transaction?: Transaction;
    }
  ): Promise<
    Map<
      string,
      Player & {
        GamePlayerMembership: GamePlayerMembership;
      }
    >
  > {
    // Get players
    const players = new Map();
    this._logger.debug(`getPlayersAsync for games`);

    // Subtract one update interval so we have last ranking for first games
    const rankingstart = moment(start)
      .subtract(
        this.rankingType.updateIntervalAmount,
        this.rankingType.updateIntervalUnit
      )
      .toDate();

    // Get all players with relevant info
    (
      await Player.findAll({
        attributes: ['id', 'gender'],
        include: [
          {
            model: Game,
            required: true,
            attributes: [],
            where: {
              id: games?.map((g) => g.id),
            },
          },
          {
            required: false,
            model: RankingPlace,
            attributes: ['single', 'double', 'mix', 'rankingDate', 'systemId'],
            where: {
              systemId: this.rankingType.id,
              // Start date = last update
              rankingDate: {
                [Op.between]: [rankingstart, end],
              },
            },
          },
        ],
        transaction: options?.transaction,
      })
    ).map((x) => {
      players.set(x.id, x);
    });

    return players;
  }

  protected async getPlayersAsync(
    start: Date,
    end: Date,
    options: {
      transaction?: Transaction;
    }
  ): Promise<Map<string, Player>> {
    // Get players
    const players = new Map();
    this._logger.debug(
      `getPlayersAsync for preiod ${start.toDateString()} - ${end.toDateString()}`
    );

    // Get all players with relevant info
    (
      await Player.findAll({
        attributes: ['id', 'gender'],
        include: [
          {
            model: Game,
            required: true,
            attributes: ['id'],
            where: {
              playedAt: {
                [Op.between]: [start, end],
              },
            },
          },
          {
            required: false,
            model: RankingLastPlace,
            attributes: [
              'single',
              'double',
              'mix',
              'singleInactive',
              'doubleInactive',
              'mixInactive',
              'systemId',
            ],
            where: {
              systemId: this.rankingType.id,
            },
          },
        ],
        transaction: options?.transaction,
      })
    ).map((x) => {
      players.set(x.id, x);
    });

    return players;
  }

  public async calculateRankingPointsPerGameAsync(
    games: Game[],
    players: Map<
      string,
      Player & {
        GamePlayerMembership: GamePlayerMembership;
      }
    >,
    rankingDate?: Date,
    options?: { transaction?: Transaction }
  ) {
    // Default options
    options = {
      transaction: undefined,
      ...options,
    };

    // Calculate ranking points per game
    const total = games.length;

    while (games.length > 0) {
      const rankings =
        this.processGame(games.pop(), players, rankingDate) ?? [];

      if (games.length % 100 === 0) {
        this._logger.debug(
          `Calulating point: ${total - games.length}/${total} (${(
            ((total - games.length) / total) *
            100
          ).toFixed(2)}%)`
        );
      }

      if (rankings.length > 0) {
        await RankingPoint.bulkCreate(
          rankings.map((r) => r.toJSON()),
          {
            returning: false,
            transaction: options?.transaction,
          }
        );
      }
    }
  }

  public async findNewPlacePlayer(
    points: RankingPoint[],
    lastRanking: RankingLastPlace,
    inactive: {
      single: boolean;
      double: boolean;
      mix: boolean;
    },
    updateRankings: boolean,
    gender: string
  ): Promise<RankingPlace> {
    const singleRankingPoints: RankingPoint[] = [];
    const doubleRankingPoints: RankingPoint[] = [];
    const mixRankingPoints: RankingPoint[] = [];

    // Sort the points by their played date
    points.sort(
      (a, b) => b.game?.playedAt?.getTime() - a.game?.playedAt?.getTime()
    );

    // Push to their respective arrays
    points.forEach((rankingPoint) => {
      switch (rankingPoint.game.gameType) {
        case GameType.S:
          singleRankingPoints.push(rankingPoint);
          break;
        case GameType.D:
          doubleRankingPoints.push(rankingPoint);
          break;
        case GameType.MX:
          mixRankingPoints.push(rankingPoint);
          break;
      }
    });

    // difference is a negative number when layers are higher
    let singleCountsForUpgrade = singleRankingPoints.filter(
      (x) => x.differenceInLevel >= this.rankingType.differenceForUpgrade * -1
    );
    let doubleCountsForUpgrade = doubleRankingPoints.filter(
      (x) => x.differenceInLevel >= this.rankingType.differenceForUpgrade * -1
    );
    let mixCountsForUpgrade = mixRankingPoints.filter(
      (x) => x.differenceInLevel >= this.rankingType.differenceForUpgrade * -1
    );

    // Filter out when there is a limit to use
    if (this.rankingType.latestXGamesToUse) {
      singleCountsForUpgrade = singleCountsForUpgrade
        // Take last x amount
        .slice(0, this.rankingType.latestXGamesToUse);
      doubleCountsForUpgrade = doubleCountsForUpgrade
        // Take last x amount
        .slice(0, this.rankingType.latestXGamesToUse);
      mixCountsForUpgrade = mixCountsForUpgrade
        // Take last x amount
        .slice(0, this.rankingType.latestXGamesToUse);
    }

    const singlePointsUpgrade = this.findPointsBetterAverage(
      singleCountsForUpgrade
    );
    const doublePointsUpgrade = this.findPointsBetterAverage(
      doubleCountsForUpgrade
    );
    const mixPointsUpgrade = this.findPointsBetterAverage(mixCountsForUpgrade);

    // difference is a negative number when layers are higher
    let singleCountsForDowngrade = singleRankingPoints.filter(
      (x) => x.differenceInLevel >= this.rankingType.differenceForDowngrade * -1
    );
    let doubleCountsForDowngrade = doubleRankingPoints.filter(
      (x) => x.differenceInLevel >= this.rankingType.differenceForDowngrade * -1
    );
    let mixCountsForDowngrade = mixRankingPoints.filter(
      (x) => x.differenceInLevel >= this.rankingType.differenceForDowngrade * -1
    );

    // Filter out when there is a limit to use
    if (this.rankingType.latestXGamesToUse) {
      singleCountsForDowngrade = singleCountsForDowngrade
        // Take last x amount
        .slice(0, this.rankingType.latestXGamesToUse);
      doubleCountsForDowngrade = doubleCountsForDowngrade
        // Take last x amount
        .slice(0, this.rankingType.latestXGamesToUse);
      mixCountsForDowngrade = mixCountsForDowngrade
        // Take last x amount
        .slice(0, this.rankingType.latestXGamesToUse);
    }

    const singlePointsDowngrade = this.findPointsBetterAverage(
      singleCountsForDowngrade,
      false
    );
    const doublePointsDowngrade = this.findPointsBetterAverage(
      doubleCountsForDowngrade,
      false
    );
    const mixPointsDowngrade = this.findPointsBetterAverage(
      mixCountsForDowngrade,
      false
    );

    // Determin new level based on inactivity or not
    let singleLevel = this.findRanking(
      singlePointsUpgrade,
      singlePointsDowngrade,
      lastRanking.single
    );
    let doubleLevel = this.findRanking(
      doublePointsUpgrade,
      doublePointsDowngrade,
      lastRanking.double
    );
    let mixLevel = this.findRanking(
      mixPointsUpgrade,
      mixPointsDowngrade,
      lastRanking.mix
    );

    if (singleLevel > lastRanking.single) {
      // If you are marked as inactive
      if (inactive.single) {
        switch (this.rankingType.inactiveBehavior) {
          case 'freeze':
            singleLevel = lastRanking.single;
            break;
          default:
          case 'decrease':
            singleLevel = lastRanking.singleInactive
              ? lastRanking.single
              : lastRanking.single + 2;
            break;
        }
      }
      // if not inactive but not have enough points, you remain the same
      else if (
        singleRankingPoints.length <= this.rankingType.gamesForInactivty
      ) {
        singleLevel = lastRanking.single;
      }
    }

    if (doubleLevel > lastRanking.double) {
      // If you are marked as inactive
      if (inactive.double) {
        switch (this.rankingType.inactiveBehavior) {
          case 'freeze':
            doubleLevel = lastRanking.double;
            break;
          default:
          case 'decrease':
            doubleLevel = lastRanking.doubleInactive
              ? lastRanking.double
              : lastRanking.double + 2;
            break;
        }
      }
      // if not inactive but not have enough points, you remain the same
      else if (
        doubleRankingPoints.length <= this.rankingType.gamesForInactivty
      ) {
        doubleLevel = lastRanking.double;
      }
    }

    if (mixLevel > lastRanking.mix) {
      // If you are marked as inactive
      if (inactive.mix) {
        switch (this.rankingType.inactiveBehavior) {
          case 'freeze':
            mixLevel = lastRanking.mix;
            break;
          default:
          case 'decrease':
            mixLevel = lastRanking.mixInactive
              ? lastRanking.mix
              : lastRanking.mix + 2;
            break;
        }
      }
      // if not inactive but not have enough points, you remain the same
      else if (mixRankingPoints.length <= this.rankingType.gamesForInactivty) {
        mixLevel = lastRanking.mix;
      }
    }

    if (updateRankings) {
      const newRanking = new RankingPlace({
        singlePoints: singlePointsUpgrade,
        mixPoints: mixPointsUpgrade,
        doublePoints: doublePointsUpgrade,
        singlePointsDowngrade,
        mixPointsDowngrade,
        doublePointsDowngrade,
        singleInactive: inactive.single,
        doubleInactive: inactive.double,
        mixInactive: inactive.mix,
        single: singleLevel,
        mix: mixLevel,
        double: doubleLevel,
        updatePossible: true,
        systemId: this.rankingType.id,
        gender,
      });

      return this.protectRanking(newRanking);
    }

    return new RankingPlace({
      singlePoints: singlePointsUpgrade,
      mixPoints: mixPointsUpgrade,
      doublePoints: doublePointsUpgrade,
      singlePointsDowngrade,
      mixPointsDowngrade,
      doublePointsDowngrade,
      singleInactive: inactive.single,
      doubleInactive: inactive.double,
      mixInactive: inactive.mix,
      single: lastRanking.single,
      mix: lastRanking.mix,
      double: lastRanking.double,
      updatePossible: false,
      systemId: this.rankingType.id,
      gender,
    });
  }

  public findPointsBetterAverage(
    rankingPoints: RankingPoint[],
    limitMinGames = true
  ) {
    const avgPoints = rankingPoints.map((x) => x.points).filter((x) => x === 0);
    const wonPoints = rankingPoints
      .filter((x) => x.points > 0)
      .sort((a, b) => b.points - a.points);
    let avg = 0;

    wonPoints.forEach((element) => {
      // add new point
      avgPoints.push(element.points);
      const sum = avgPoints.reduce((a, b) => a + b, 0);
      const gamesToUse = limitMinGames
        ? avgPoints.length < this.rankingType.minNumberOfGamesUsedForUpgrade
          ? this.rankingType.minNumberOfGamesUsedForUpgrade
          : avgPoints.length
        : avgPoints.length;

      const newAvg = sum / gamesToUse;
      // if the average is lower then previous stop counting
      if (newAvg < avg) {
        return avg;
      } else {
        avg = newAvg;
      }
    });

    return Math.round(avg);
  }

  public findPointsAverage(rankingPoints: RankingPoint[] = []) {
    if (rankingPoints.length === 0) {
      // when less then 2 games you go down 1 level (this is restricted by the fact you can only change one level at a time)
      return 0;
    }

    const points = rankingPoints
      .map((x) => x.points)
      .reduce((a, b) => a + b, 0);
    const amountOfGamesToUse = rankingPoints.length;

    const pointAvg = points / amountOfGamesToUse;

    return Math.round(pointAvg);
  }

  public findRanking(
    pointsUpgrade: number,
    pointsDowngrade: number,
    currentLevel: number
  ): number {
    let topLevelByUpgradePoints = 1;
    let bottomLevelByDowngradePoints = this.rankingType.amountOfLevels;

    // Check if can go up,
    // we start at our current level and go down in number (so higher rankings)
    for (
      let estimatedUpLevel = currentLevel;
      estimatedUpLevel >= 1;
      estimatedUpLevel--
    ) {
      const pointsNeededForNextLevel =
        this.rankingType.pointsToGoUp[
          this.rankingType.pointsToGoUp.length + 1 - estimatedUpLevel
        ];
      if (pointsNeededForNextLevel > pointsUpgrade) {
        topLevelByUpgradePoints = estimatedUpLevel;
        break;
      }
    }

    const upgrade = currentLevel - topLevelByUpgradePoints;
    if (upgrade > 0) {
      // You can only go up one level at a time
      if (
        this.rankingType.maxLevelUpPerChange &&
        upgrade > this.rankingType.maxLevelUpPerChange
      ) {
        return currentLevel - this.rankingType.maxLevelUpPerChange;
      } else {
        return topLevelByUpgradePoints;
      }
    }

    // if topLevel was lower then current level, this means we can go down
    for (
      let estimatedDownLevel = currentLevel;
      estimatedDownLevel < this.rankingType.amountOfLevels;
      estimatedDownLevel++
    ) {
      const pointsNeededForPreviousLevel =
        this.rankingType.pointsToGoDown[
          this.rankingType.pointsToGoDown.length - estimatedDownLevel
        ];
      if (pointsNeededForPreviousLevel < pointsDowngrade) {
        bottomLevelByDowngradePoints = estimatedDownLevel;
        break;
      }
    }

    const decrease = bottomLevelByDowngradePoints - currentLevel;
    if (
      this.rankingType.maxLevelDownPerChange &&
      decrease > this.rankingType.maxLevelDownPerChange
    ) {
      return currentLevel + this.rankingType.maxLevelDownPerChange;
    } else {
      return bottomLevelByDowngradePoints;
    }
  }

  showLevel(level: number): string {
    return `${level}`;
  }
}

export interface RankingTiming {
  amount: number;
  unit: 'months' | 'weeks' | 'days';
}

export interface RankingPeriod {
  start: Date;
  end: Date;
}
