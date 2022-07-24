import { RankingSystems } from '../enums';
import { RankingSystem } from '../models';
import { SystemGroupBuilder } from './systemGroupBuilder';

export class SystemBuilder {
  private system: RankingSystem;

  constructor(
    rankingSystem: RankingSystems,
    amountOfLevels: number,
    procentWinning: number,
    procentWinningPlus1: number
  ) {
    this.system = new RankingSystem({
      rankingSystem,
      amountOfLevels,
      procentWinning,
      procentWinningPlus1,
    });
  }

  static Create(
    rankingSystem: RankingSystems,
    amountOfLevels: number,
    procentWinning: number,
    procentWinningPlus1: number
  ): SystemBuilder {
    return new SystemBuilder(
      rankingSystem,
      amountOfLevels,
      procentWinning,
      procentWinningPlus1
    );
  }

  WithName(name: string): SystemBuilder {
    this.system.name = name;

    return this;
  }

  WithGroup(group: SystemGroupBuilder) {
    group.WithSystem(this.system);
    return this;
  }

  WithCaluclationIntervalAmount(
    caluclationIntervalAmount: number
  ): SystemBuilder {
    this.system.caluclationIntervalAmount = caluclationIntervalAmount;
    return this;
  }
  WithCalculationIntervalUnit(
    calculationIntervalUnit: 'months' | 'weeks' | 'days'
  ): SystemBuilder {
    this.system.calculationIntervalUnit = calculationIntervalUnit;
    return this;
  }
  WithUpdateIntervalAmount(updateIntervalAmount: number): SystemBuilder {
    this.system.updateIntervalAmount = updateIntervalAmount;
    return this;
  }
  WithUpdateIntervalUnit(
    updateIntervalUnit: 'months' | 'weeks' | 'days'
  ): SystemBuilder {
    this.system.updateIntervalUnit = updateIntervalUnit;
    return this;
  }
  WithProcentWinning(procentWinning: number): SystemBuilder {
    this.system.procentWinning = procentWinning;
    return this;
  }
  WithProcentWinningPlus1(procentWinningPlus1: number): SystemBuilder {
    this.system.procentWinningPlus1 = procentWinningPlus1;
    return this;
  }
  WithProcentLosing(procentLosing: number): SystemBuilder {
    this.system.procentLosing = procentLosing;
    return this;
  }
  WithMinNumberOfGamesUsedForUpgrade(
    minNumberOfGamesUsedForUpgrade: number
  ): SystemBuilder {
    this.system.minNumberOfGamesUsedForUpgrade = minNumberOfGamesUsedForUpgrade;
    return this;
  }
  WithMaxDiffLevels(maxDiffLevels: number): SystemBuilder {
    this.system.maxDiffLevels = maxDiffLevels;
    return this;
  }
  WithMaxDiffLevelsHighest(maxDiffLevelsHighest: number): SystemBuilder {
    this.system.maxDiffLevelsHighest = maxDiffLevelsHighest;
    return this;
  }
  WithLatestXGamesToUse(latestXGamesToUse: number): SystemBuilder {
    this.system.latestXGamesToUse = latestXGamesToUse;
    return this;
  }
  WithDifferenceForUpgrade(differenceForUpgrade: number): SystemBuilder {
    this.system.differenceForUpgrade = differenceForUpgrade;
    return this;
  }
  WithDifferenceForDowngrade(differenceForDowngrade: number): SystemBuilder {
    this.system.differenceForDowngrade = differenceForDowngrade;
    return this;
  }
  WithMaxLevelDownPerChange(maxLevelDownPerChange: number): SystemBuilder {
    this.system.maxLevelDownPerChange = maxLevelDownPerChange;
    return this;
  }
  WithGamesForInactivty(gamesForInactivty: number): SystemBuilder {
    this.system.gamesForInactivty = gamesForInactivty;
    return this;
  }

  AsPrimary(): SystemBuilder {
    this.system.primary = true;
    return this;
  }

  WithId(id: string): SystemBuilder {
    this.system.id = id;
    return this;
  }

  async Build(): Promise<RankingSystem> {
    try {
      await this.system.save();
    } catch (error) {
      console.log(error);
      throw error;
    }
    return this.system;
  }
}
