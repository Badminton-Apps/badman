import { RankingSystems, StartingType } from '@badman/utils';
import moment from 'moment';
import { RankingGroup as RankingGroup } from './group.model';

export class RankingSystem {
  id?: string;
  name?: string;
  amountOfLevels?: number;
  procentWinning?: number;
  procentWinningPlus1?: number;
  procentLosing?: number;
  minNumberOfGamesUsedForUpgrade?: number;
  minNumberOfGamesUsedForDowngrade?: number;
  maxDiffLevels?: number;
  maxDiffLevelsHighest?: number;
  latestXGamesToUse?: number;
  maxLevelUpPerChange?: number;
  maxLevelDownPerChange?: number;
  gamesForInactivty?: number;
  inactivityAmount?: number;
  inactivityUnit?: 'months' | 'weeks' | 'days';
  caluclationIntervalLastUpdate?: Date;
  caluclationIntervalAmount?: number;
  calculationIntervalUnit?: 'months' | 'weeks' | 'days';
  periodAmount?: number;
  periodUnit?: 'months' | 'weeks' | 'days';
  updateIntervalAmountLastUpdate?: Date;
  updateIntervalAmount?: number;
  updateIntervalUnit?: 'months' | 'weeks' | 'days';
  rankingSystem?: RankingSystems;
  primary?: boolean;
  runCurrently?: boolean;
  differenceForUpgrade?: number;
  differenceForDowngrade?: number;
  startingType?: StartingType;
  pointsToGoUp?: number[];
  pointsWhenWinningAgainst?: number[];
  pointsToGoDown?: number[];

  rankingGroups?: RankingGroup[];

  constructor(args?: Partial<RankingSystem>) {
    this.id = args?.id;
    this.name = args?.name;
    this.amountOfLevels = args?.amountOfLevels;
    this.procentWinning = args?.procentWinning;
    this.procentWinningPlus1 = args?.procentWinningPlus1;
    this.procentLosing = args?.procentLosing;
    this.minNumberOfGamesUsedForUpgrade = args?.minNumberOfGamesUsedForUpgrade;
    this.minNumberOfGamesUsedForDowngrade = args?.minNumberOfGamesUsedForUpgrade;
    this.maxDiffLevels = args?.maxDiffLevels;
    this.maxDiffLevelsHighest = args?.maxDiffLevelsHighest;
    this.latestXGamesToUse = args?.latestXGamesToUse;
    this.maxLevelUpPerChange = args?.maxLevelUpPerChange;
    this.maxLevelDownPerChange = args?.maxLevelDownPerChange;
    this.gamesForInactivty = args?.gamesForInactivty;
    this.inactivityAmount = args?.inactivityAmount;
    this.inactivityUnit = args?.inactivityUnit;
    this.caluclationIntervalLastUpdate = moment(
      args?.caluclationIntervalLastUpdate
    ).toDate();
    this.caluclationIntervalAmount = args?.caluclationIntervalAmount;
    this.calculationIntervalUnit = args?.calculationIntervalUnit;
    this.periodAmount = args?.periodAmount;
    this.periodUnit = args?.periodUnit;
    this.updateIntervalAmountLastUpdate = moment(
      args?.updateIntervalAmountLastUpdate
    ).toDate();
    this.updateIntervalAmount = args?.updateIntervalAmount;
    this.updateIntervalUnit = args?.updateIntervalUnit;
    this.rankingSystem = args?.rankingSystem;
    this.primary = args?.primary;
    this.runCurrently = args?.runCurrently;
    this.differenceForUpgrade = args?.differenceForUpgrade;
    this.differenceForDowngrade = args?.differenceForDowngrade;
    this.startingType = args?.startingType;
    this.pointsToGoUp = args?.pointsToGoUp;
    this.pointsWhenWinningAgainst = args?.pointsWhenWinningAgainst;
    this.pointsToGoDown = args?.pointsToGoDown;

    this.rankingGroups = args?.rankingGroups?.map((g) => new RankingGroup(g));
  }
}

export interface Counts {
  single: RankingPlacesResult[];
  double: RankingPlacesResult[];
  mix: RankingPlacesResult[];
}

export interface RankingPlaceResult {
  level: number;
  amount: number;
}
export interface RankingPlacesResult {
  date: Date;
  points: RankingPlaceResult[];
}

