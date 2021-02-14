import { RankingSystemGroup } from './group.model';

export class RankingSystem {
  id: string;
  name: string;
  amountOfLevels: number;
  procentWinning: number;
  procentWinningPlus1: number;
  procentLosing: number;
  minNumberOfGamesUsedForUpgrade: number;
  maxDiffLevels: number;
  latestXGamesToUse: number;
  calculationIntervalUnit: 'months' | 'weeks' | 'days';
  caluclationIntervalAmount: number;
  periodUnit: 'months' | 'weeks' | 'days';
  periodAmount: number;
  updateIntervalUnit: 'months' | 'weeks' | 'days';
  updateIntervalAmount: number;
  inactivityAmount: number;
  inactivityUnit: 'months' | 'weeks' | 'days';
  gamesForInactivty: number;
  rankingSystem: RankingSystems;
  differenceForUpgrade: number;
  differenceForDowngrade: number;
  maxLevelUpPerChange: number;
  maxLevelDownPerChange: number;
  startingType: StartingType;
  primary: boolean;
  groups: RankingSystemGroup[];
  counts: Counts;

  constructor({ ...args }) {
    this.id = args.id;
    this.name = args.name;
    this.amountOfLevels = args.amountOfLevels;
    this.procentWinning = args.procentWinning;
    this.procentWinningPlus1 = args.procentWinningPlus1;
    this.procentLosing = args.procentLosing;
    this.minNumberOfGamesUsedForUpgrade = args.minNumberOfGamesUsedForUpgrade;
    this.maxDiffLevels = args.maxDiffLevels;
    this.latestXGamesToUse = args.latestXGamesToUse;
    this.calculationIntervalUnit = args.calculationIntervalUnit;
    this.caluclationIntervalAmount = args.caluclationIntervalAmount;
    this.periodUnit = args.periodUnit;
    this.periodAmount = args.periodAmount;
    this.updateIntervalUnit = args.updateIntervalUnit;
    this.updateIntervalAmount = args.updateIntervalAmount;
    this.inactivityAmount = args.inactivityAmount;
    this.inactivityUnit = args.inactivityUnit;
    this.gamesForInactivty = args.gamesForInactivty;
    this.rankingSystem = args.rankingSystem;
    this.differenceForUpgrade = args.differenceForUpgrade;
    this.differenceForDowngrade = args.differenceForDowngrade;
    this.maxLevelUpPerChange = args.maxLevelUpPerChange;
    this.maxLevelDownPerChange = args.maxLevelDownPerChange;
    this.startingType = args.startingType;
    this.primary = args.primary;
    this.groups = args?.groups?.map((g) => new RankingSystemGroup(g));
    this.counts = args.counts;
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

export enum RankingSystems {
  BVL,
  LFBB,
  ORIGINAL,
}

export enum StartingType {
  formula = 'formula',
  tableLFBB = 'tableLFBB',
  tableBVL = 'tableBVL',
}
