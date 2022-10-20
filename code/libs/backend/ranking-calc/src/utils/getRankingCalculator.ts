import { RankingSystem, RankingSystems } from '@badman/backend-database';
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
