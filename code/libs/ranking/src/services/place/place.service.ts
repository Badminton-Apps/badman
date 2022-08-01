import {
  GameType,
  Player,
  RankingLastPlace,
  RankingPlace,
  RankingPoint,
  RankingSystem,
} from '@badman/api/database';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import moment from 'moment';
import { Op, Transaction } from 'sequelize';

@Injectable()
export class PlaceService {
  private readonly _logger = new Logger(PlaceService.name);

  /**
   * Does a new ranking place for period
   * @param param0
   */
  public async createUpdateRanking({
    system,
    calcDate,
    options,
  }: {
    system: RankingSystem;
    calcDate?: Date | string;
    options?: {
      updateRanking?: boolean;
      transaction?: Transaction;
    };
  }) {
    const { transaction } = options ?? {};

    if (!system) {
      throw new NotFoundException(`${RankingSystem.name}`);
    }
    this._logger.log(`Calculatting places for ${system.name}`);

    const start = moment(calcDate)
      .subtract(system.periodAmount, system.periodUnit)
      .toDate();
    const stop = moment(calcDate).toDate();

    const where = {
      systemId: system.id,
      rankingDate: stop.toISOString(),
    };

    const pointCount = await RankingPlace.count({ where, transaction });
    if (pointCount > 0) {
      const deleted = await RankingPlace.destroy({ where, transaction });
      this._logger.verbose(
        `Truncated ${deleted} RankingPlace for system ${
          where.systemId
        } and between ${start.toISOString()} and ${stop.toISOString()}`
      );
    }

    const players = await this._getPlayers(system.id, { transaction });

    // Calculate places per player
    const total = players.length;
    let done = 0;
    for (const player of players) {
      let lastRankings = await player.getRankingPlaces({
        where: {
          systemId: system.id,
        },
        transaction,
        order: [['rankingDate', 'DESC']],
        limit: 1,
      });

      if (lastRankings.length === 0) {
        const newRanking = new RankingPlace({
          systemId: system.id,
          playerId: player.id,
          gender: player.gender,
          single: system.amountOfLevels,
          double: system.amountOfLevels,
          mix: system.amountOfLevels,
        });
        lastRankings = [newRanking];
      }

      // Get last ranking (thecnically should be only one)
      const lastRanking = lastRankings[0];

      // Start creating the new one
      const newRanking = new RankingPlace({
        systemId: system.id,
        playerId: player.id,
        rankingDate: stop,
      });

      // Single
      const single = await this._getNewPlace(system, player, {
        ...options,
        start,
        stop,
        lastRanking: lastRanking.single,
        lastRankingInactive: lastRanking.singleInactive,
        gameType: GameType.S,
      });

      newRanking.single = single.level;
      newRanking.singleInactive = single.inactive;
      newRanking.singlePoints = single.upgrade;
      newRanking.singlePointsDowngrade = single.downgrade;

      // Double
      const double = await this._getNewPlace(system, player, {
        ...options,
        start,
        stop,
        lastRanking: lastRanking.double,
        lastRankingInactive: lastRanking.doubleInactive,
        gameType: GameType.D,
      });

      newRanking.double = double.level;
      newRanking.doubleInactive = double.inactive;
      newRanking.doublePoints = double.upgrade;
      newRanking.doublePointsDowngrade = double.downgrade;

      // Mix
      const mix = await this._getNewPlace(system, player, {
        ...options,
        start,
        stop,
        lastRanking: lastRanking.mix,
        lastRankingInactive: lastRanking.mixInactive,
        gameType: GameType.MX,
      });

      newRanking.mix = mix.level;
      newRanking.mixInactive = mix.inactive;
      newRanking.mixPoints = mix.upgrade;
      newRanking.mixPointsDowngrade = mix.downgrade;

      if (options.updateRanking) {
        // Protections
        this._protectRanking(
          newRanking,
          system.maxDiffLevels,
          system.amountOfLevels
        );
        newRanking.updatePossible = true;
      }

      // Save the new ranking
      await newRanking.save({ transaction });

      // Increase 
      done++;
      if (done % 100 === 0) {
        this._logger.debug(
          `Calulating places: ${done}/${total} (${((done / total) * 100).toFixed(
            2
          )}%)`
        );
      }
    }

    if (options.updateRanking) {
      system.updateIntervalAmountLastUpdate = stop;
    }

    system.caluclationIntervalLastUpdate = stop;
    await system.save({ transaction });
  }

  private async _getNewPlace(
    system: RankingSystem,
    player: Player,
    options: {
      start?: Date;
      stop?: Date;
      gameType: GameType;
      updateRanking?: boolean;
      lastRanking: number;
      lastRankingInactive: boolean;
      transaction?: Transaction;
    }
  ) {
    const {
      transaction,
      start,
      stop,
      lastRanking,
      lastRankingInactive,
      gameType,
      updateRanking,
    } = options ?? {};

    const games = await this._getGames(system, player, {
      start,
      stop,
      transaction,
      gameType,
    });
    const inactive = await this._isInactive(system, games.length, player, {
      start,
      stop,
      transaction,
      gameType,
    });

    const { upgrade, downgrade } = this._calculatePoints(
      system,
      games?.map((g) => g.rankingPoints?.[0])
    );

    const result = {
      upgrade,
      downgrade,
      level: lastRanking,
      inactive,
    };

    if (updateRanking) {
      // Determin new level based on inactivity or not
      let level = this._findRanking(system, upgrade, downgrade, lastRanking);

      if (level > lastRanking) {
        // If you are marked as inactive
        if (inactive) {
          switch (system.inactiveBehavior) {
            case 'freeze':
              level = lastRanking;
              break;
            default:
            case 'decrease':
              level = lastRankingInactive ? lastRanking : lastRanking + 2;
              break;
          }
        }
        // if not inactive but not have enough points, you remain the same
        else if (games.length <= system.gamesForInactivty) {
          level = lastRanking;
        }
      }

      result.level = level;
      result.inactive = inactive;
    }

    return result;
  }

  private async _getPlayers(
    systemId: string,
    options?: { transaction?: Transaction }
  ) {
    const { transaction } = options ?? {};

    // we require lastRankingPlace to skip players who have never played
    return await Player.findAll({
      attributes: ['id', 'gender'],
      include: [
        {
          required: true,
          model: RankingLastPlace,
          attributes: ['single', 'double', 'mix', 'rankingDate', 'systemId'],
          where: {
            systemId,
          },
        },
      ],
      transaction,
    });
  }

  private async _getGames(
    system: RankingSystem,
    player: Player,
    options: {
      transaction?: Transaction;
      start?: Date;
      stop?: Date;
      gameType?: GameType;
    }
  ) {
    const { transaction } = options ?? {};

    const where: { [key: string]: unknown } = {};

    if (options.start && options.stop) {
      where['playedAt'] = {
        [Op.between]: [
          options.start?.toISOString(),
          options.stop?.toISOString(),
        ],
      };
    } else if (options.start) {
      where['playedAt'] = {
        [Op.gte]: options.start?.toISOString(),
      };
    } else if (options.stop) {
      where['playedAt'] = {
        [Op.lte]: options.stop?.toISOString(),
      };
    }

    if (options.gameType) {
      where['gameType'] = options.gameType;
    }

    return await player.getGames({
      where,
      include: [
        {
          required: true,
          model: RankingPoint,
          where: {
            playerId: player.id,
            systemId: system.id,
          },
        },
      ],
      order: [['playedAt', 'DESC']],
      transaction,
    });
  }

  private async _isInactive(
    system: RankingSystem,
    gamesAmount: number,
    player: Player,
    options: {
      transaction?: Transaction;
      start?: Date;
      stop?: Date;
      gameType?: GameType;
    }
  ) {
    if (gamesAmount <= system.gamesForInactivty) {
      const start = moment(options.stop)
        .subtract(system.inactivityAmount, system.inactivityUnit)
        .toDate();
      const allGames = await this._getGames(system, player, {
        ...options,
        start: start,
      });

      return allGames.length <= system.gamesForInactivty;
    }

    return false;
  }

  private _calculatePoints(system: RankingSystem, points: RankingPoint[]) {
    // difference is a negative number when layers are higher
    let pointsForUpgrade = points.filter(
      (x) => x.differenceInLevel >= system.differenceForUpgrade * -1
    );

    // Filter out when there is a limit to use
    if (system.latestXGamesToUse) {
      pointsForUpgrade = pointsForUpgrade
        // Take last x amount
        .slice(0, system.latestXGamesToUse);
    }

    const pointsUpgrade = this._findPointsAverage(
      pointsForUpgrade,
      system.minNumberOfGamesUsedForUpgrade
    );

    // difference is a negative number when layers are higher
    let pointsForDowngrade = points.filter(
      (x) => x.differenceInLevel >= system.differenceForDowngrade * -1
    );

    // Filter out when there is a limit to use
    if (system.latestXGamesToUse) {
      pointsForDowngrade = pointsForDowngrade
        // Take last x amount
        .slice(0, system.latestXGamesToUse);
    }

    const pointsDowngrade = this._findPointsAverage(pointsForDowngrade);

    return {
      upgrade: pointsUpgrade,
      downgrade: pointsDowngrade,
    };
  }

  private _findPointsAverage(
    rankingPoints: RankingPoint[],
    limitMinGames?: number
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
        ? avgPoints.length < limitMinGames
          ? limitMinGames
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

  private _findRanking(
    system: RankingSystem,
    pointsUpgrade: number,
    pointsDowngrade: number,
    currentLevel: number
  ): number {
    let topLevelByUpgradePoints = 1;
    let bottomLevelByDowngradePoints = system.amountOfLevels;

    // Check if can go up,
    // we start at our current level and go down in number (so higher rankings)
    for (
      let estimatedUpLevel = currentLevel;
      estimatedUpLevel >= 1;
      estimatedUpLevel--
    ) {
      const pointsNeededForNextLevel =
        system.pointsToGoUp[system.pointsToGoUp.length + 1 - estimatedUpLevel];
      if (pointsNeededForNextLevel > pointsUpgrade) {
        topLevelByUpgradePoints = estimatedUpLevel;
        break;
      }
    }

    const upgrade = currentLevel - topLevelByUpgradePoints;
    if (upgrade > 0) {
      // You can only go up one level at a time
      if (system.maxLevelUpPerChange && upgrade > system.maxLevelUpPerChange) {
        return currentLevel - system.maxLevelUpPerChange;
      } else {
        return topLevelByUpgradePoints;
      }
    }

    // if topLevel was lower then current level, this means we can go down
    for (
      let estimatedDownLevel = currentLevel;
      estimatedDownLevel < system.amountOfLevels;
      estimatedDownLevel++
    ) {
      const pointsNeededForPreviousLevel =
        system.pointsToGoDown[
          system.pointsToGoDown.length - estimatedDownLevel
        ];
      if (pointsNeededForPreviousLevel < pointsDowngrade) {
        bottomLevelByDowngradePoints = estimatedDownLevel;
        break;
      }
    }

    const decrease = bottomLevelByDowngradePoints - currentLevel;
    if (
      system.maxLevelDownPerChange &&
      decrease > system.maxLevelDownPerChange
    ) {
      return currentLevel + system.maxLevelDownPerChange;
    } else {
      return bottomLevelByDowngradePoints;
    }
  }

  private _protectRanking(
    newRanking: RankingPlace,
    maxDiffLevels: number,
    amountOfLevels: number
  ): RankingPlace {
    const highest = Math.min(
      newRanking.single,
      newRanking.double,
      newRanking.mix
    );

    if (newRanking.single - highest >= maxDiffLevels) {
      newRanking.single = highest + maxDiffLevels;
    }
    if (newRanking.double - highest >= maxDiffLevels) {
      newRanking.double = highest + maxDiffLevels;
    }
    if (newRanking.mix - highest >= maxDiffLevels) {
      newRanking.mix = highest + maxDiffLevels;
    }

    if (newRanking.single > amountOfLevels) {
      newRanking.single = amountOfLevels;
    }
    if (newRanking.double > amountOfLevels) {
      newRanking.double = amountOfLevels;
    }
    if (newRanking.mix > amountOfLevels) {
      newRanking.mix = amountOfLevels;
    }

    return newRanking;
  }
}
