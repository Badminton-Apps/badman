import moment, { Moment } from 'moment';
import { Op, Transaction } from 'sequelize';
import {
  Game,
  GameType,
  Player,
  RankingLastPlace,
  RankingPlace,
  RankingPoint,
  RankingSystem,
} from '@badman/api/database';
import { RankingCalc, PointCalculator } from '../utils';
import { Logger } from '@nestjs/common';

export class BvlRankingCalc extends RankingCalc {
  private _gameSplitInterval = 30 * 24 * 60 * 60 * 1000; // 30 days max

  constructor(public rankingType: RankingSystem) {
    super(rankingType, new Logger(BvlRankingCalc.name));
    this.pointCalculator = new PointCalculator(this.rankingType);
  }

  showLevel(level: number): string {
    return `R${level}`;
  }

  async beforeCalculationAsync(start?: Moment) {
    await super.beforeCalculationAsync(start);
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
    options = {
      ...options,
      hasHistoricalGames: options?.hasHistoricalGames ?? false,
    };
    super.calculatePeriodAsync(start, end, updateRankings, options);
    const originalEnd = new Date(end);
    const originalStart = new Date(start);
    let gamesStartDate = this.rankingType.caluclationIntervalLastUpdate;

    // If running from start, we are reimporting evertyhing,
    // so the game points need to be caculated for those previous period
    if (options?.hasHistoricalGames) {
      this._logger.verbose('Modifying gamesstart date for historical games');
      gamesStartDate = moment(end)
        .subtract(this.rankingType.period.amount, this.rankingType.period.unit)
        .toDate();
    }

    const dateRanges: { start: Date; end: Date }[] = [];

    while (end > gamesStartDate) {
      const suggestedEndDate = new Date(
        gamesStartDate.getTime() + this._gameSplitInterval
      );

      const slice = {
        start: new Date(gamesStartDate),
        end: suggestedEndDate > end ? end : suggestedEndDate,
      };

      dateRanges.push(slice);
      // Forward
      gamesStartDate = slice.end;
    }

    // Get all players (with latest ranking)
    const players = await this.getPlayers({
      transaction: options?.transaction,
    });

    for (const range of dateRanges) {
      // Get all relevant games and players
      const gamesRange = await this.getGamesAsync(range.start, range.end, {
        transaction: options?.transaction,
        logger: this._logger,
      });

      // Calculate new points
      await this.calculateRankingPointsPerGameAsync(
        gamesRange,
        players,
        range.end,
        { transaction: options.transaction }
      );
    }

    this._logger.debug('Updating ranking');

    // Calculate places for new period
    await this._calculateRankingPlacesAsync(
      originalStart,
      originalEnd,
      players,
      updateRankings,
      options.transaction
    );
  }

  // Testing grounds: https://stackblitz.com/edit/typescript-2yg1po
  private async _calculateRankingPlacesAsync(
    startDate: Date,
    endDate: Date,
    players: Map<string, Player>,
    updateRankings: boolean,
    transaction?: Transaction
  ) {
    const eligbleForRanking: Map<string, RankingPoint[]> = new Map();
    this._logger.log(
      `calculateRankingPlacesAsync for period ${startDate.toISOString()} - ${endDate.toISOString()}`
    );
    (
      await RankingPoint.findAll({
        where: {
          systemId: this.rankingType.id,
          points: {
            [Op.ne]: null,
          },
        },
        attributes: ['points', 'playerId', 'differenceInLevel'],
        include: [
          {
            model: Game,
            attributes: ['id', 'gameType', 'playedAt'],
            where: {
              playedAt: {
                [Op.and]: [{ [Op.gt]: startDate }, { [Op.lte]: endDate }],
              },
            },
          },
        ],
        transaction,
      })
    ).map((x: RankingPoint) => {
      const points = eligbleForRanking.get(x.playerId) || [];
      points.push(x);
      eligbleForRanking.set(x.playerId, points);
    });

    let placesMen = [];
    let placesWomen = [];
    let gameCount = null;

    const amountSinceStart = Math.abs(
      moment([2016, 8, 1]).diff(endDate, this.rankingType.inactivityUnit)
    );

    const canBeInactive =
      amountSinceStart > this.rankingType.inactivityAmount && updateRankings;

    if (canBeInactive) {
      this._logger.verbose(`Checking inactive for ${players.size} players`);
      gameCount = await this.countGames(
        players,
        endDate,
        this.rankingType,
        transaction
      );
    }

    this._logger.debug('Getting new places');
    for (const [, player] of players) {
      const rankingPoints = eligbleForRanking.get(player.id) || [];
      const inactive = { single: false, double: false, mix: false };

      if (canBeInactive && gameCount) {
        const playerGameCount = gameCount.get(player.id) || {
          single: 0,
          double: 0,
          mix: 0,
        };
        inactive.single =
          playerGameCount.single < this.rankingType.gamesForInactivty;
        inactive.double =
          playerGameCount.double < this.rankingType.gamesForInactivty;
        inactive.mix = playerGameCount.mix < this.rankingType.gamesForInactivty;
      }

      let lastRanking = player.rankingLastPlaces.find(
        (p) => p.systemId === this.rankingType.id
      );

      // Check for null
      if (lastRanking == null) {
        lastRanking = new RankingLastPlace({
          systemId: this.rankingType.id,
          playerId: player.id,
          gender: player.gender,
          single: this.rankingType.amountOfLevels,
          double: this.rankingType.amountOfLevels,
          mix: this.rankingType.amountOfLevels,
        });
      }

      // Check if a single ranking place is null
      if ((lastRanking?.single ?? null) === null) {
        lastRanking.single = this.rankingType.amountOfLevels;
      }
      if ((lastRanking?.double ?? null) === null) {
        lastRanking.double = this.rankingType.amountOfLevels;
      }
      if ((lastRanking?.mix ?? null) === null) {
        lastRanking.mix = this.rankingType.amountOfLevels;
      }

      const newPlace = await this.findNewPlacePlayer(
        rankingPoints ?? [],
        lastRanking,
        inactive,
        updateRankings,
        player.gender
      );
      newPlace.playerId = player.id;
      newPlace.systemId = this.rankingType.id;
      newPlace.rankingDate = endDate;

      if (player.gender === 'M') {
        placesMen.push(newPlace.toJSON());
      } else {
        placesWomen.push(newPlace.toJSON());
      }
    }

    const types = ['single', 'double', 'mix'];

    types.forEach((type) => {
      // Reset ranking per type
      let rankingLevel = 1;
      let rankingLevelAcc = 1;

      let totalRanking = 1;
      let totalRankingAcc = 1;

      const mapFunction = (value, index, places: RankingPlace[], counts) => {
        // check previous one (except first one)
        if (index !== 0) {
          const prev = places[index - 1];

          if (prev[`${type}`] !== value[`${type}`]) {
            // reset per level
            rankingLevel = 1;
            rankingLevelAcc = 1;
            // Copy When level changes, we need to copy instead of reset
            totalRanking = totalRankingAcc;
          } else if (prev[`${type}Points`] !== value[`${type}Points`]) {
            // put ranking at totalRanking when points change
            rankingLevel = rankingLevelAcc;
            totalRanking = totalRankingAcc;
          }
        }

        value[`${type}Rank`] = rankingLevel;
        value[`total${capitalizedType}Ranking`] = totalRanking;
        value[`totalWithin${capitalizedType}Level`] = counts[value[`${type}`]];

        // Increase totalRanking
        rankingLevelAcc++;
        totalRankingAcc++;

        return value;
      };

      const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1);
      const countsMale = {};
      const countsFemale = {};

      // Total counts per level
      this.rankingType.levelArray.forEach((level) => {
        countsMale[level + 1] = placesMen.filter(
          (place) => place[`${type}`] === level + 1
        ).length;
        countsFemale[level + 1] = placesWomen.filter(
          (place) => place[`${type}`] === level + 1
        ).length;
      });

      // Sort and map
      placesMen = placesMen
        .sort((a, b) => this.sortByPoints(a, b, type))
        .map((value, index) =>
          mapFunction(value, index, placesMen, countsMale)
        );

      // Reset for gender switch
      rankingLevel = 1;
      rankingLevelAcc = 1;

      totalRanking = 1;
      totalRankingAcc = 1;

      // Sort and map
      placesWomen = placesWomen
        .sort((a, b) => this.sortByPoints(a, b, type))
        .map((value, index) =>
          mapFunction(value, index, placesWomen, countsFemale)
        );
    });

    await RankingPlace.bulkCreate([...placesMen, ...placesWomen], {
      ignoreDuplicates: true,
      returning: false,
      transaction,
    });
  }

  getStartRanking(currentPlace: number, startPlaces: number[]): number {
    const level = startPlaces.indexOf(
      startPlaces.find((x) => x > currentPlace)
    );
    if (level === -1) {
      return this.rankingType.amountOfLevels;
    } else {
      return level + 1;
    }
  }
  getStartRankingRev(currentPlace: number, startPlaces: number[]): number {
    const level = startPlaces.indexOf(
      startPlaces.find((x) => x < currentPlace)
    );
    if (level === -1) {
      return this.rankingType.amountOfLevels;
    } else {
      return level + 1;
    }
  }

  async countGames(
    players: Map<string, Player>,
    endDate: Date,
    rankingType: RankingSystem,
    transaction?: Transaction
  ) {
    const startDate = moment(endDate)
      .subtract(rankingType.inactivityAmount, rankingType.inactivityUnit)
      .toDate();

    const counts = await RankingPoint.count({
      where: {
        systemId: rankingType.id,
        playerId: {
          [Op.in]: Array.from(players.keys()),
        },
      },
      include: [
        {
          model: Game,
          attributes: ['gameType'],
          where: {
            playedAt: {
              [Op.and]: [
                {
                  [Op.gt]: startDate,
                },
                { [Op.lte]: endDate },
              ],
            },
          },
          required: true,
        },
      ],
      group: ['RankingPoint.playerId', 'game.gameType'],
      transaction,
    });

    const results = new Map<
      string,
      {
        single: number;
        double: number;
        mix: number;
      }
    >();
    counts.forEach(
      (result: { count: number; gameType: GameType; playerId: string }) => {
        const player = results.get(result.playerId) || {
          single: 0,
          double: 0,
          mix: 0,
        };
        switch (result.gameType) {
          case GameType.S:
            player.single = result.count;
            break;
          case GameType.MX:
            player.mix = result.count;
            break;
          case GameType.D:
            player.double = result.count;
            break;
        }

        results.set(result.playerId, player);
      }
    );

    return results;
  }

  private sortByPoints(a, b, type) {
    // First sort by level
    if (a[`${type}`] > b[`${type}`]) {
      return 1;
    } else if (a[`${type}`] < b[`${type}`]) {
      return -1;
    } else {
      // Level are equal, sort by points
      if (a[`${type}Points`] < b[`${type}Points`]) {
        return 1;
      } else if (a[`${type}Points`] > b[`${type}Points`]) {
        return -1;
      } else {
        // points are equal, try sorting on downgrade points
        return a[`${type}PointsDowngrade`] === b[`${type}PointsDowngrade`]
          ? // Still the same, so we give them same place
            0
          : a[`${type}PointsDowngrade`] < b[`${type}PointsDowngrade`]
          ? // More downgrade points = higher place
            1
          : // Less downgrade points = lower place
            -1;
      }
    }
  }
}
