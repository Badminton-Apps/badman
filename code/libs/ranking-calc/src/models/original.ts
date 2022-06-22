import { RankingSystem, RankingPlace } from '@badman/api/database';
import { Logger } from '@nestjs/common';
import moment, { Moment } from 'moment';
import { RankingCalc } from '../utils';

export class OriginalRankingCalc extends RankingCalc {
  constructor(public rankingType: RankingSystem) {
    super(rankingType, new Logger(OriginalRankingCalc.name));
  }

  async beforeCalculationAsync(start?: Moment) {
    await super.beforeCalculationAsync(
      moment(this.rankingType.caluclationIntervalLastUpdate)
    );
  }

  private _initialPlayers(
    player: {
      [key: string]: string;
    },
    place: RankingPlace,
    type: string
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
