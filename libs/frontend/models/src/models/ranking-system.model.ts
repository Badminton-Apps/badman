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
  calculationLastUpdate?: Date;
  calculationIntervalAmount?: number;
  calculationIntervalUnit?: 'months' | 'weeks' | 'days';
  updateDayOfWeek?: number;
  periodAmount?: number;
  periodUnit?: 'months' | 'weeks' | 'days';
  updateLastUpdate?: Date;
  updateIntervalAmount?: number;
  updateIntervalUnit?: 'months' | 'weeks' | 'days';
  calculationDayOfWeek?: number;
  rankingSystem?: RankingSystems;
  primary?: boolean;
  calculateUpdates?: boolean;
  runCurrently?: boolean;
  differenceForUpgradeSingle?: number;
  differenceForUpgradeDouble?: number;
  differenceForUpgradeMix?: number;
  differenceForDowngradeSingle?: number;
  differenceForDowngradeDouble?: number;
  differenceForDowngradeMix?: number;
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
    this.minNumberOfGamesUsedForDowngrade = args?.minNumberOfGamesUsedForDowngrade;
    this.maxDiffLevels = args?.maxDiffLevels;
    this.maxDiffLevelsHighest = args?.maxDiffLevelsHighest;
    this.latestXGamesToUse = args?.latestXGamesToUse;
    this.maxLevelUpPerChange = args?.maxLevelUpPerChange;
    this.maxLevelDownPerChange = args?.maxLevelDownPerChange;
    this.gamesForInactivty = args?.gamesForInactivty;
    this.inactivityAmount = args?.inactivityAmount;
    this.inactivityUnit = args?.inactivityUnit;
    this.calculationLastUpdate = moment(args?.calculationLastUpdate).toDate();
    this.calculationIntervalAmount = args?.calculationIntervalAmount;
    this.calculationIntervalUnit = args?.calculationIntervalUnit;
    this.calculationDayOfWeek = args?.calculationDayOfWeek;
    this.periodAmount = args?.periodAmount;
    this.periodUnit = args?.periodUnit;
    this.updateLastUpdate = moment(args?.updateLastUpdate).toDate();
    this.updateIntervalAmount = args?.updateIntervalAmount;
    this.updateIntervalUnit = args?.updateIntervalUnit;
    this.updateDayOfWeek = args?.updateDayOfWeek;
    this.rankingSystem = args?.rankingSystem;
    this.primary = args?.primary;
    this.calculateUpdates = args?.calculateUpdates;
    this.runCurrently = args?.runCurrently;
    this.differenceForUpgradeSingle = args?.differenceForUpgradeSingle;
    this.differenceForUpgradeDouble = args?.differenceForUpgradeDouble;
    this.differenceForUpgradeMix = args?.differenceForUpgradeMix;
    this.differenceForDowngradeSingle = args?.differenceForDowngradeSingle;
    this.differenceForDowngradeDouble = args?.differenceForDowngradeDouble;
    this.differenceForDowngradeMix = args?.differenceForDowngradeMix;
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
