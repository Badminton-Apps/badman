import moment, { Moment } from 'moment';
import { Op, Transaction } from 'sequelize';
import { logger } from '../../utils';
import { GameType } from '../enums';
import {
  DrawCompetition,
  DrawTournament,
  EncounterCompetition,
  Game,
  LastRankingPlace,
  Player,
  RankingPlace,
  RankingPoint,
  RankingSystem,
  SubEventCompetition,
  SubEventTournament,
} from '../sequelize';
import { PointCalculator } from './point-calculator';
import { StartingRanking } from './starting-ranking';

export class RankingCalc {
  periods: RankingPeriod[];
  protected pointCalculator: PointCalculator;
  protected startingRanking: StartingRanking;

  constructor(
    public rankingType: RankingSystem,
    protected runningFromStart: boolean
  ) {
    this.startingRanking = new StartingRanking();
  }

  async beforeCalculationAsync(start?: Moment) {
    const SystemId = this.rankingType.id;
    let startingDate =
      start ?? moment(this.rankingType.caluclationIntervalLastUpdate);

    if (this.runningFromStart) {
      startingDate = moment(0);
    }

    const where = {
      SystemId,
      rankingDate: {
        [Op.gte]: startingDate.toDate(),
      },
    };

    try {
      const placeCount = await RankingPlace.count({ where });

      if (placeCount > 0) {
        const deleted = await RankingPlace.destroy({ where });
        logger.silly(
          `Truncated ${deleted} RankingPlace for system ${
            where.SystemId
          } and after ${startingDate.toISOString()}`
        );
      }

      const newWhere = {
        systemId: SystemId,
        rankingDate: {
          [Op.gte]: startingDate.toDate(),
        },
      };
      const placeLastCount = await LastRankingPlace.count({ where: newWhere });

      if (placeLastCount > 0) {
        const deleted = await LastRankingPlace.destroy({ where: newWhere });
        logger.silly(
          `Truncated ${deleted} LastRankingPlace for system ${
            where.SystemId
          } and after ${startingDate.toISOString()}`
        );
      }

      const pointCount = await RankingPoint.count({ where });
      if (pointCount > 0) {
        const deleted = await RankingPoint.destroy({ where });
        logger.silly(
          `Truncated ${deleted} RankingPoint for system ${
            where.SystemId
          } and after ${startingDate.toISOString()}`
        );
      }

      this.rankingType.runCurrently = true;
      this.rankingType.runDate = new Date();
      await this.rankingType.save();
    } catch (er) {
      logger.error('Something went wrong clearing the DB', er);
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

    logger.silly('Config', {
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

    let hasHistoricalGames = this.runningFromStart;

    while (lastPeriod.isSameOrBefore(stop)) {
      // get the start / stop for the period
      // note: this is probably different then the calculation interval
      const periodStart = lastPeriod
        .clone()
        .subtract(this.rankingType.period.amount, this.rankingType.period.unit)
        .toDate();
      const periodStop = lastPeriod.toDate();
      const updateRankings = lastUpdateRanking.isSameOrBefore(lastPeriod);

      await this.calculatePeriodAsync(periodStart, periodStop, updateRankings, {
        hasHistoricalGames,
      });

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
      hasHistoricalGames = false;
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
    options?: {
      hasHistoricalGames?: boolean;
      transaction?: Transaction;
    }
  ) {
    logger.info(
      `Started Calcualting for period ${start.toISOString()} untill ${end.toISOString()}${
        updateRankings ? ', and updating rankings' : ''
      }, historical: ${options?.hasHistoricalGames ?? false}`
    );
  }

  async afterCalculationAsync() {
    this.rankingType.runCurrently = false;
    this.rankingType.save();
  }

  public processGame(
    game: Game,
    players: Map<string, Player>,
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
          player.getDataValue('GamePlayer').team === 1 &&
          player.getDataValue('GamePlayer').player === 1
      )?.id
    );
    const player2Team1 = players.get(
      game.players.find(
        (player) =>
          player.getDataValue('GamePlayer').team === 1 &&
          player.getDataValue('GamePlayer').player === 2
      )?.id
    );
    const player1Team2 = players.get(
      game.players.find(
        (player) =>
          player.getDataValue('GamePlayer').team === 2 &&
          player.getDataValue('GamePlayer').player === 1
      )?.id
    );
    const player2Team2 = players.get(
      game.players.find(
        (player) =>
          player.getDataValue('GamePlayer').team === 2 &&
          player.getDataValue('GamePlayer').player === 2
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
          SystemId: this.rankingType.id,
          playerId: player1Team1.id,
          GameId: game.id,
          rankingDate: rankingDate ?? game.playedAt,
          differenceInLevel: player1Team1Points === 0 ? differenceInLevel : 0,
        })
      );
    }
    if (player1Team2 && player1Team2.id && player1Team2Points != null) {
      rankings.push(
        new RankingPoint({
          points: player1Team2Points,
          SystemId: this.rankingType.id,
          playerId: player1Team2.id,
          GameId: game.id,
          rankingDate: rankingDate ?? game.playedAt,
          differenceInLevel: player1Team2Points === 0 ? differenceInLevel : 0,
        })
      );
    }

    if (player2Team1 && player2Team1.id && player2Team1Points != null) {
      rankings.push(
        new RankingPoint({
          points: player2Team1Points,
          SystemId: this.rankingType.id,
          playerId: player2Team1.id,
          GameId: game.id,
          rankingDate: rankingDate ?? game.playedAt,
          differenceInLevel: player2Team1Points === 0 ? differenceInLevel : 0,
        })
      );
    }

    if (player2Team2 && player2Team2.id && player2Team2Points != null) {
      rankings.push(
        new RankingPoint({
          points: player2Team2Points,
          SystemId: this.rankingType.id,
          playerId: player2Team2.id,
          GameId: game.id,
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
    transaction?: Transaction
  ): Promise<Game[]> {
    logger.debug(
      `getGamesAsync for period ${start.toISOString()} - ${end.toISOString()}`
    );

    const where = {
      playedAt: {
        [Op.and]: [{ [Op.gt]: start }, { [Op.lte]: end }],
      },
    };

    // const groups = this.rankingType.groups.map(r => r.id);

    const games = await Game.findAll({
      where,
      attributes: ['id', 'gameType', 'winner', 'set1Team1', 'set1Team2'],
      include: [
        { model: Player, attributes: ['id'] },
        {
          model: EncounterCompetition,
          attributes: [],
          include: [
            {
              model: DrawCompetition,
              attributes: [],
              include: [
                {
                  model: SubEventCompetition,
                  attributes: [],
                },
              ],
            },
          ],
        },
        {
          model: DrawTournament,
          attributes: [],
          include: [
            {
              model: SubEventTournament,
              attributes: [],
            },
          ],
        },
      ],
      transaction,
    });

    logger.debug(`Got ${games.length} games`);

    return games;
  }
  protected async getPlayersAsync(
    start: Date,
    end: Date,
    transaction?: Transaction
  ): Promise<Map<string, Player>> {
    const players = new Map();

    logger.debug(
      `getPlayersAsync for preiod ${start.toISOString()} - ${end.toISOString()}`
    );

    // Get all players with relevant info
    (
      await Player.findAll({
        attributes: ['id', 'gender'],
        include: [
          {
            model: LastRankingPlace,
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
          {
            model: Game,
            required: true,
            attributes: [],
            where: {
              playedAt: {
                [Op.and]: [{ [Op.gt]: start }, { [Op.lte]: end }],
              },
            },
          },
        ],
        transaction,
      })
    ).map((x) => {
      players.set(x.id, x);
    });

    return players;
  }

  public async calculateRankingPointsPerGameAsync(
    games: Game[],
    players: Map<string, Player>,
    rankingDate?: Date,
    transaction?: Transaction
  ) {
    const total = games.length;

    while (games.length > 0) {
      const rankings =
        this.processGame(games.pop(), players, rankingDate) ?? [];

      if (games.length % 100 === 0) {
        logger.debug(
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
            transaction,
          }
        );
      }
    }
  }

  public async findNewPlacePlayer(
    points: RankingPoint[],
    lastRanking: LastRankingPlace,
    inactive: {
      single: boolean;
      double: boolean;
      mix: boolean;
    },
    updateRankings: boolean
  ): Promise<RankingPlace> {
    const singleRankingPoints: RankingPoint[] = [];
    const doubleRankingPoints: RankingPoint[] = [];
    const mixRankingPoints: RankingPoint[] = [];

    // Sort the points by their played date
    points.sort(
      (a, b) => b.game.playedAt.getTime() - a.game.playedAt.getTime()
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
        singleLevel = lastRanking.singleInactive
          ? lastRanking.single
          : lastRanking.single + 2;
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
        doubleLevel = lastRanking.doubleInactive
          ? lastRanking.double
          : lastRanking.double + 2;
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
        mixLevel = lastRanking.mixInactive
          ? lastRanking.mix
          : lastRanking.mix + 2;
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
        SystemId: this.rankingType.id
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
      SystemId: this.rankingType.id
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
