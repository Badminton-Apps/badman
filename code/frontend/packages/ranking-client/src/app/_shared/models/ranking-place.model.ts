import { Player } from './player.model';
import { RankingSystem } from './ranking-system.model';

export interface RankingPlace {
  singlePointsDowngrade: number;
  singleRank: number;
  totalSingleRanking: number;
  totalWithinSingleLevel: number;
  singlePoints: number;
  single: string;
  singleInactive: boolean;
  mixPointsDowngrade: number;
  mixRank: number;
  totalMixRanking: number;
  totalWithinMixLevel: number;
  mixPoints: number;
  mix: string;
  mixInactive: boolean;
  doublePointsDowngrade: number;
  doubleRank: number;
  totalDoubleRanking: number;
  totalWithinDoubleLevel: number;
  doublePoints: number;
  double: string;
  doubleInactive: boolean;
  rankingSystem: RankingSystem;
  updatePossible: boolean;
  rank?: number;
  rankingDate?: Date;
  statisticUrl?: string;
  primary: boolean;
  player?: Player;
}
