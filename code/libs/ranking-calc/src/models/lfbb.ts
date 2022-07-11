import { Moment } from 'moment';
import { Op, Transaction } from 'sequelize';
import {
  Game,
  RankingLastPlace,
  Player,
  RankingPlace,
  RankingPoint,
  RankingSystem,
} from '@badman/api/database';
import { RankingCalc } from '../utils/rankingCalc';
import { Logger } from '@nestjs/common';
import { PointCalculator, splitInChunks } from '../utils';

export class LfbbRankingCalc extends RankingCalc {
  private _gameSplitInterval = 30 * 24 * 60 * 60 * 1000; // 30 days max

  constructor(public rankingType: RankingSystem) {
    super(rankingType, new Logger(LfbbRankingCalc.name));
    this.pointCalculator = new PointCalculator(this.rankingType);
  }

  showLevel(level: number): string {
    return `R${level}`;
  }

  async beforeCalculationAsync(start?: Moment) {
    await super.beforeCalculationAsync(start);
  }

  private _initialPlayers(
    player: { [key: string]: string },
    place: RankingPlace,
    type: string,
    startPlaces: number[]
  ) {
    // Set type specific stuff
    place[`${type}Points`] = parseInt(player['Totaal punten'], 10);
    place[`${type}Rank`] = parseInt(player.Rank, 10);
    place[type] = this.getStartRanking(parseInt(player.Rank, 10), startPlaces);
    return place;
  }

  private _limitByLetter(highestRanking: number) {
    if (highestRanking <= 4) {
      return 4;
    } else if (highestRanking <= 8) {
      return 8;
    } else if (highestRanking <= 12) {
      return 12;
    } else if (highestRanking <= 16) {
      return 16;
    } else {
      return 17;
    }
  }

  protected protectRanking(
    newRanking: RankingPlace
    // highestRanking: { single: number; mix: number; double: number }
  ): RankingPlace {
    // const maxInLevel = {
    //   single: this.limitByLetter(highestRanking.single),
    //   double: this.limitByLetter(highestRanking.double),
    //   mix: this.limitByLetter(highestRanking.mix)
    // };

    // if (newRanking.single > maxInLevel.single) {
    //   newRanking.single = maxInLevel.single;
    // }
    // if (newRanking.double > maxInLevel.double) {
    //   newRanking.double = maxInLevel.double;
    // }
    // if (newRanking.mix > maxInLevel.mix) {
    //   newRanking.mix = maxInLevel.mix;
    // }

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

    return newRanking;
  }

  async calculatePeriodAsync(
    start: Date,
    end: Date,
    updateRankings: boolean,
    options?: {
      transaction?: Transaction;
    }
  ) {
    options = {
      ...options,
    };
    super.calculatePeriodAsync(start, end, updateRankings, options);
    const originalEnd = new Date(end);
    const originalStart = new Date(start);
    let gamesStartDate = this.rankingType.caluclationIntervalLastUpdate;

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
      updateRankings
    );
  }

  private async _calculateRankingPlacesAsync(
    startDate: Date,
    endDate: Date,
    players: Map<string, Player>,
    updateRankings: boolean
  ) {
    const eligbleForRanking: Map<string, RankingPoint[]> = new Map();
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
            required: true,
          },
        ],
      })
    ).map((x: RankingPoint) => {
      const points = eligbleForRanking.get(x.playerId) || [];
      points.push(x);
      eligbleForRanking.set(x.playerId, points);
    });

    const places = [];

    this._logger.debug(
      `Got eligble ${
        eligbleForRanking.size
      } for ranking for period ${startDate.toISOString()}-${endDate.toISOString()}`
    );

    players.forEach(async (player) => {
      const points = eligbleForRanking.get(player.id) || [];
      const lastRanking =
        player.rankingLastPlaces.find(
          (p) => p.systemId === this.rankingType.id
        ) ??
        ({
          single: this.rankingType.amountOfLevels,
          mix: this.rankingType.amountOfLevels,
          double: this.rankingType.amountOfLevels,
        } as RankingLastPlace);
      // const highestRanking = player.getHighsetRanking(
      //   this.rankingType.id,
      //   this.rankingType.amountOfLevels
      // );
      const newPlace = await this.findNewPlacePlayer(
        points,
        lastRanking,
        {
          single: false,
          double: false,
          mix: false,
        },
        updateRankings,
        player.gender
      );

      places.push({
        ...newPlace,
        playerId: player.id,
        systemId: this.rankingType.id,
        rankingDate: endDate,
      });
    });
    this._logger.debug(`proccesd ${places.length} places`);

    const chunks = splitInChunks(places, 500);
    for (const chunk of chunks) {
      await RankingPlace.bulkCreate(chunk, {
        ignoreDuplicates: true,
        returning: false,
      });
    }
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
}
