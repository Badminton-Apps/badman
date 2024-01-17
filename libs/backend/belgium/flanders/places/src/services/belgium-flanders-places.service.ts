import {
  Player,
  RankingPlace,
  RankingPoint,
  RankingSystem,
} from '@badman/backend-database';
import { GameType, getRankingProtected } from '@badman/utils';
import { Injectable } from '@nestjs/common';
import moment from 'moment';
import { Op, Transaction } from 'sequelize';

@Injectable()
export class BelgiumFlandersPlacesService {
  public async newPlaceForPlayer(
    player: Player,
    system: RankingSystem,
    stop: Date,
    start: Date,
    options:
      | {
          updateRanking?: boolean | undefined;
          transaction?: Transaction | undefined;
        }
      | undefined,
  ) {
    let lastRankings = await player.getRankingPlaces({
      where: {
        systemId: system.id,
        rankingDate: {
          [Op.lte]: stop,
        },
      },
      transaction: options?.transaction,
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
    let newRanking = new RankingPlace({
      systemId: system.id,
      playerId: player.id,
      rankingDate: stop,
    });

    // Single
    const singlePromise = this._getNewPlace(system, player, {
      ...options,
      start,
      stop,
      lastRanking: lastRanking.single ?? system.amountOfLevels,
      lastRankingInactive: lastRanking.singleInactive ?? false,
      gameType: GameType.S,
    });

    // Mix
    const mixPromise = this._getNewPlace(system, player, {
      ...options,
      start,
      stop,
      lastRanking: lastRanking.mix ?? system.amountOfLevels,
      lastRankingInactive: lastRanking.mixInactive ?? false,
      gameType: GameType.MX,
    });

    // Double
    const doublePromise = this._getNewPlace(system, player, {
      ...options,
      start,
      stop,
      lastRanking: lastRanking.double ?? system.amountOfLevels,
      lastRankingInactive: lastRanking.doubleInactive ?? false,
      gameType: GameType.D,
    });

    const [single, mix, double] = await Promise.all([
      singlePromise,
      mixPromise,
      doublePromise,
    ]);

    newRanking.single = single.level;
    newRanking.singleInactive = single.inactive;
    newRanking.singlePoints = single.upgrade;
    newRanking.singlePointsDowngrade = single.downgrade;

    newRanking.double = double.level;
    newRanking.doubleInactive = double.inactive;
    newRanking.doublePoints = double.upgrade;
    newRanking.doublePointsDowngrade = double.downgrade;

    newRanking.mix = mix.level;
    newRanking.mixInactive = mix.inactive;
    newRanking.mixPoints = mix.upgrade;
    newRanking.mixPointsDowngrade = mix.downgrade;

    if (options?.updateRanking) {
      // Protections
      newRanking = getRankingProtected(newRanking, system);
      newRanking.updatePossible = true;
    } else {
      newRanking.updatePossible = false;
    }

    // Save the new ranking
    await newRanking.save({ transaction: options?.transaction });
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
    },
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
      (games?.map((g) => g.rankingPoints?.[0])?.filter((g) => g != undefined) ??
        []) as RankingPoint[],
      gameType,
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
        else if (games.length <= (system.gamesForInactivty ?? 0)) {
          level = lastRanking;
        }
      }

      result.level = level;
      result.inactive = inactive;
    }

    return result;
  }

  private async _getGames(
    system: RankingSystem,
    player: Player,
    options: {
      transaction?: Transaction;
      start?: Date;
      stop?: Date;
      gameType?: GameType;
    },
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
      attributes: ['id'],
      where,
      include: [
        {
          attributes: ['id', 'points', 'differenceInLevel'],
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
    },
  ) {
    if (
      !system.inactivityAmount ||
      !system.inactivityUnit ||
      !system.gamesForInactivty
    ) {
      return false;
    }

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

  private _calculatePoints(
    system: RankingSystem,
    points: RankingPoint[],
    gameType: GameType,
  ) {
    if (!points.length) {
      return {
        upgrade: 0,
        downgrade: 0,
      };
    }

    const propDowngrade =
      gameType === GameType.S
        ? 'differenceForDowngradeSingle'
        : gameType === GameType.D
          ? 'differenceForDowngradeDouble'
          : 'differenceForDowngradeMix';

    const propUpgrade =
      gameType === GameType.S
        ? 'differenceForUpgradeSingle'
        : gameType === GameType.D
          ? 'differenceForUpgradeDouble'
          : 'differenceForUpgradeMix';

    // difference is a negative number when layers are higher
    let pointsForUpgrade = points.filter(
      (x) => (x.differenceInLevel ?? 0) >= (system[propUpgrade] ?? 0) * -1,
    );

    // Filter out when there is a limit to use
    if (system.latestXGamesToUse) {
      pointsForUpgrade = pointsForUpgrade
        // Take last x amount
        .slice(0, system.latestXGamesToUse);
    }

    const pointsUpgrade = this._findPointsAverage(
      pointsForUpgrade,
      system.minNumberOfGamesUsedForUpgrade,
    );

    // difference is a negative number when layers are higher
    let pointsForDowngrade = points.filter(
      (x) => (x.differenceInLevel ?? 0) >= (system[propDowngrade] ?? 0) * -1,
    );

    // Filter out when there is a limit to use
    if (system.latestXGamesToUse) {
      pointsForDowngrade = pointsForDowngrade
        // Take last x amount
        .slice(0, system.latestXGamesToUse);
    }

    const pointsDowngrade = this._findPointsAverage(
      pointsForDowngrade,
      system.minNumberOfGamesUsedForDowngrade,
    );

    return {
      upgrade: pointsUpgrade,
      downgrade: pointsDowngrade,
    };
  }

  private _findPointsAverage(
    rankingPoints: RankingPoint[],
    limitMinGames?: number,
  ) {
    const avgPoints = rankingPoints.map((x) => x.points).filter((x) => x === 0);
    const wonPoints = rankingPoints
      .filter((x) => (x.points ?? 0) > 0)
      .sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
    let avg = 0;

    wonPoints.forEach((element) => {
      // add new point
      avgPoints.push(element.points);
      const sum = avgPoints.reduce((a, b) => (a ?? 0) + (b ?? 0), 0) ?? 0;
      const gamesToUse = limitMinGames
        ? avgPoints.length < limitMinGames
          ? limitMinGames
          : avgPoints.length
        : avgPoints.length;

      const newAvg = sum / gamesToUse;
      // if the average is lower then previous stop counting
      if (newAvg > avg) {
        avg = newAvg;
      }
    });

    return Math.round(avg);
  }

  private _findRanking(
    system: RankingSystem,
    pointsUpgrade: number,
    pointsDowngrade: number,
    currentLevel: number,
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
}
