import { RankingSystem } from '@badman/backend-database';
import { RankingSystems } from '@badman/utils';
import {
  BvlRankingCalc,
  LfbbRankingCalc,
  OriginalRankingCalc,
} from '../models';

export function getSystemCalc(rankingSystem: RankingSystem) {
  switch (rankingSystem.rankingSystem) {
    case RankingSystems.LFBB:
    case RankingSystems.VISUAL:
      return new LfbbRankingCalc(rankingSystem);
    case RankingSystems.BVL:
      return new BvlRankingCalc(rankingSystem);
    case RankingSystems.ORIGINAL:
      return new OriginalRankingCalc(rankingSystem);
  }
}
