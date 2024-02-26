import { Player } from './player.model';
import { RankingSystem } from './ranking-system.model';

export class RankingPlace {
  id?: string;
  singlePointsDowngrade?: number;
  singleRank?: number;
  totalSingleRanking?: number;
  totalWithinSingleLevel?: number;
  singlePoints?: number;
  single?: number;
  singleInactive?: boolean;
  mixPointsDowngrade?: number;
  mixRank?: number;
  totalMixRanking?: number;
  totalWithinMixLevel?: number;
  mixPoints?: number;
  mix?: number;
  mixInactive?: boolean;
  doublePointsDowngrade?: number;
  doubleRank?: number;
  totalDoubleRanking?: number;
  totalWithinDoubleLevel?: number;
  doublePoints?: number;
  double?: number;
  doubleInactive?: boolean;
  rankingSystem?: RankingSystem;
  updatePossible?: boolean;
  rank?: number;
  rankingDate?: Date;
  statisticUrl?: string;
  primary?: boolean;
  player?: Player;

  playerId?: string;
  systemId?: string;

  constructor(args?: Partial<RankingPlace>) {
    this.id = args?.id;
    this.singlePointsDowngrade = args?.singlePointsDowngrade;
    this.singleRank = args?.singleRank;
    this.totalSingleRanking = args?.totalSingleRanking;
    this.totalWithinSingleLevel = args?.totalWithinSingleLevel;
    this.singlePoints = args?.singlePoints;
    this.single = args?.single;
    this.singleInactive = args?.singleInactive;
    this.mixPointsDowngrade = args?.mixPointsDowngrade;
    this.mixRank = args?.mixRank;
    this.totalMixRanking = args?.totalMixRanking;
    this.totalWithinMixLevel = args?.totalWithinMixLevel;
    this.mixPoints = args?.mixPoints;
    this.mix = args?.mix;
    this.mixInactive = args?.mixInactive;
    this.doublePointsDowngrade = args?.doublePointsDowngrade;
    this.doubleRank = args?.doubleRank;
    this.totalDoubleRanking = args?.totalDoubleRanking;
    this.totalWithinDoubleLevel = args?.totalWithinDoubleLevel;
    this.doublePoints = args?.doublePoints;
    this.double = args?.double;
    this.doubleInactive = args?.doubleInactive;
    this.rankingSystem = args?.rankingSystem;
    this.updatePossible = args?.updatePossible;
    this.rank = args?.rank;
    this.rankingDate = args?.rankingDate != null ? new Date(args.rankingDate) : undefined;
    this.statisticUrl = args?.statisticUrl;
    this.primary = args?.primary;
    this.player = args?.player;

    this.playerId = args?.playerId;
    this.systemId = args?.systemId;
  }
}
