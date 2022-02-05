import { RankingSystems } from '../enums';
import { RankingSystem } from '../sequelize/ranking';
import { BvlRankingCalc } from './bvl';
import { LfbbRankingCalc } from './lfbb';
import { OriginalRankingCalc } from './original';


export function getSystemCalc(rankingSystem: RankingSystem) {
  switch (rankingSystem.rankingSystem) {
    case RankingSystems.LFBB:
    case RankingSystems.VISUAL:
      return new LfbbRankingCalc(rankingSystem, false);
    case RankingSystems.BVL:
      return new BvlRankingCalc(rankingSystem, false);
    case RankingSystems.ORIGINAL:
      return new OriginalRankingCalc(rankingSystem, false);
  }
}