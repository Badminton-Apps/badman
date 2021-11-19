import {
  logger,
  DataBaseHandler,
  Game,
  Player,
  RankingPlace,
  RankingPoint,
  RankingSystem,
  LastRankingPlace
} from '@badvlasim/shared';
import moment, { Moment } from 'moment';
import { Op } from 'sequelize';
import { PointCalculator } from '../point-calculator';
import { RankingCalc } from '../rankingCalc';

export class LfbbRankingCalc extends RankingCalc {
  private _gameSplitInterval = 30 * 24 * 60 * 60 * 1000; // 30 days max
  
  constructor(
    public rankingType: RankingSystem,
    protected dataBaseService: DataBaseHandler,
    protected runningFromStart: boolean
  ) {
    super(rankingType, dataBaseService, runningFromStart);
    this.pointCalculator = new PointCalculator(this.rankingType);
  }

  showLevel(level: number): string {
    return `R${level}`;
  }

  async beforeCalculationAsync(start?: Moment) {
    await super.beforeCalculationAsync(start);

    if (this.runningFromStart) {
      logger.debug('Adding initial players');
      await this.startingRanking.addInitialPlayersAsync(
        this.rankingType.startingType,
        this.rankingType.id,
        this.rankingType.amountOfLevels,
        this._initialPlayers.bind(this),
        this.protectRanking.bind(this)
      );

      this.rankingType.caluclationIntervalLastUpdate = moment([2017, 8, 1]).toDate();
      this.rankingType.updateIntervalAmountLastUpdate = moment([2017, 8, 1]).toDate();
    }
  }

  private _initialPlayers(player: any, place: RankingPlace, type: string, startPlaces: number[]) {
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

    const highest = Math.min(newRanking.single, newRanking.double, newRanking.mix);
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
    historicalGames: boolean
  ) {
    super.calculatePeriodAsync(start, end, updateRankings, historicalGames);
    const originalEnd = new Date(end);
    const originalStart = new Date(start);
    let gamesStartDate = this.rankingType.caluclationIntervalLastUpdate;

    // If running from start, we are reimporting evertyhing,
    // so the game points need to be caculated for those previous period
    if (historicalGames) {
      logger.silly('Modifying gamesstart date for historical games');
      gamesStartDate = moment(end)
        .subtract(this.rankingType.period.amount, this.rankingType.period.unit)
        .toDate();
    }

    const dateRanges: { start: Date; end: Date }[] = [];

    while (end > gamesStartDate) {
      const suggestedEndDate = new Date(gamesStartDate.getTime() + this._gameSplitInterval);

      const slice = {
        start: new Date(gamesStartDate),
        end: suggestedEndDate > end ? end : suggestedEndDate
      };

      dateRanges.push(slice); 
      // Forward
      gamesStartDate = slice.end;
    }

    for (const range of dateRanges) {
      // Get all relevant games and players
      const playersRange = await this.getPlayersAsync(range.start, range.end);
      const gamesRange = await this.getGamesAsync(range.start, range.end);

      // Calculate new points
      await this.calculateRankingPointsPerGameAsync(gamesRange, playersRange, range.end);
    }

    // Calculate places for new period
    const players = await this.getPlayersAsync(originalStart, originalEnd);
    await this._calculateRankingPlacesAsync(originalStart, originalEnd, players, updateRankings);
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
          SystemId: this.rankingType.id,
          points: {
            [Op.ne]: null
          }
        },
        attributes: ['points', 'playerId', 'differenceInLevel'],
        include: [
          {
            model: Game,
            attributes: ['id', 'gameType'],
            where: {
              playedAt: {
                [Op.and]: [{ [Op.gt]: startDate }, { [Op.lte]: endDate }]
              }
            },
            required: true
          }
        ]
      })
    ).map((x: RankingPoint) => {
      const points = eligbleForRanking.get(x.playerId) || [];
      points.push(x);
      eligbleForRanking.set(x.playerId, points);
    });

    const places = [];

    logger.debug(
      `Got eligble ${
        eligbleForRanking.size
      } for ranking for period ${startDate.toISOString()}-${endDate.toISOString()}`
    );

    players.forEach(async player => {
      const points = eligbleForRanking.get(player.id) || [];
      const lastRanking = player.lastRankingPlaces.find(p => p.systemId === this.rankingType.id) ?? {
        single: this.rankingType.amountOfLevels,
        mix: this.rankingType.amountOfLevels,
        double: this.rankingType.amountOfLevels,
      } as LastRankingPlace;
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
          mix: false
        },
        updateRankings
      );

      places.push({
        ...newPlace,
        playerId: player.id,
        SystemId: this.rankingType.id,
        rankingDate: endDate
      });
    });
    logger.debug(`proccesd ${places.length} places`);

    await this.dataBaseService.addRankingPlaces(places);
  }

  getStartRanking(currentPlace: number, startPlaces: number[]): number {
    const level = startPlaces.indexOf(startPlaces.find(x => x > currentPlace));
    if (level === -1) {
      return this.rankingType.amountOfLevels;
    } else {
      return level + 1;
    }
  }
}
