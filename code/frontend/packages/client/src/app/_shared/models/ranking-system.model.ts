import { RankingSystemGroup } from './group.model';

export class RankingSystem {
  id?: string;
  name?: string;
  amountOfLevels?: number;
  procentWinning?: number;
  procentWinningPlus1?: number;
  procentLosing?: number;
  minNumberOfGamesUsedForUpgrade?: number;
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

  groups?: RankingSystemGroup[];

  constructor({ ...args }: Partial<RankingSystem>) {
    this.id = args.id;
    this.name = args.name;
    this.amountOfLevels = args.amountOfLevels;
    this.procentWinning = args.procentWinning;
    this.procentWinningPlus1 = args.procentWinningPlus1;
    this.procentLosing = args.procentLosing;
    this.minNumberOfGamesUsedForUpgrade = args.minNumberOfGamesUsedForUpgrade;
    this.maxDiffLevels = args.maxDiffLevels;
    this.maxDiffLevelsHighest = args.maxDiffLevelsHighest;
    this.latestXGamesToUse = args.latestXGamesToUse;
    this.maxLevelUpPerChange = args.maxLevelUpPerChange;
    this.maxLevelDownPerChange = args.maxLevelDownPerChange;
    this.gamesForInactivty = args.gamesForInactivty;
    this.inactivityAmount = args.inactivityAmount;
    this.inactivityUnit = args.inactivityUnit;
    this.caluclationIntervalLastUpdate = new Date(args.caluclationIntervalLastUpdate as unknown as string);
    this.caluclationIntervalAmount = args.caluclationIntervalAmount;
    this.calculationIntervalUnit = args.calculationIntervalUnit;
    this.periodAmount = args.periodAmount;
    this.periodUnit = args.periodUnit;
    this.updateIntervalAmountLastUpdate = new Date(args.updateIntervalAmountLastUpdate as unknown as string);
    this.updateIntervalAmount = args.updateIntervalAmount;
    this.updateIntervalUnit = args.updateIntervalUnit;
    this.rankingSystem = args.rankingSystem;
    this.primary = args.primary;
    this.runCurrently = args.runCurrently;
    this.differenceForUpgrade = args.differenceForUpgrade;
    this.differenceForDowngrade = args.differenceForDowngrade;
    this.startingType = args.startingType;

    this.groups = args?.groups?.map((g) => new RankingSystemGroup(g));
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
  VISUAL
}

export enum StartingType {
  formula = 'formula',
  tableLFBB = 'tableLFBB',
  tableBVL = 'tableBVL',
}
