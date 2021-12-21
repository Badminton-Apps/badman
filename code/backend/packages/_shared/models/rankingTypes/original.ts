import {
  RankingPlace,
  RankingSystem
} from '../sequelize';
import moment, { Moment } from 'moment';
import { RankingCalc } from './rankingCalc';
import { logger } from '../../utils';

export class OriginalRankingCalc extends RankingCalc {
  constructor(
    public rankingType: RankingSystem,
    protected runningFromStart: boolean
  ) {
    super(rankingType, runningFromStart);
  }


  async beforeCalculationAsync(start?: Moment) {
    if (this.runningFromStart) {
      await super.beforeCalculationAsync(start);
      logger.debug('Adding initial players');
      await this.startingRanking.addInitialPlayersAsync(
        this.rankingType.startingType,
        this.rankingType.id,
        this.rankingType.amountOfLevels,
        this._initialPlayers.bind(this),
        this.protectRanking.bind(this)
      );
    } else {
      await super.beforeCalculationAsync(moment(this.rankingType.caluclationIntervalLastUpdate));
    }
  }

  private _initialPlayers(
    player: {
      [key: string]: string;
    },
    place: RankingPlace,
    type: string,
  ): RankingPlace {
    // Set type specific stuff
    place[`${type}Points`] = parseInt(player['Totaal punten'], 10);
    place[`${type}Rank`] = parseInt(player.Rank, 10);
    place[type] = parseInt(player.Rank, 10);
    return place;
  }

  showLevel(level: number): string {
    switch (level) {
      case 1:
        return 'A';
      case 2:
        return 'B1';
      case 3:
        return 'B2';
      case 4:
        return 'C1';
      case 5:
        return 'C2';
      case 6:
        return 'D';
    }
  }
}
