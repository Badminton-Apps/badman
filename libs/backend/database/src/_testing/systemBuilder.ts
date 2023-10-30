import { RankingSystems } from '@badman/utils';
import { RankingSystem } from '../models';
import { SystemGroupBuilder } from './systemGroupBuilder';
import { RankingPlaceBuilder } from './rankingPlaceBuilder';

export class SystemBuilder {
  private build = false;
  
  private system: RankingSystem;

  private groups: SystemGroupBuilder[] = [];
  private rankingPlaces: RankingPlaceBuilder[] = [];

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
    this.groups.push(group);
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
  WithMinNumberOfGamesUsedForDowngrade(
    minNumberOfGamesUsedForDowngrade: number
  ): SystemBuilder {
    this.system.minNumberOfGamesUsedForDowngrade = minNumberOfGamesUsedForDowngrade;
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
  WithDifferenceForUpgradeSingle(differenceForUpgrade: number): SystemBuilder {
    this.system.differenceForUpgradeSingle = differenceForUpgrade;
    return this;
  }
  WithDifferenceForUpgradeDouble(differenceForUpgrade: number): SystemBuilder {
    this.system.differenceForUpgradeDouble = differenceForUpgrade;
    return this;
  }
  WithDifferenceForUpgradeMix(differenceForUpgrade: number): SystemBuilder {
    this.system.differenceForUpgradeMix = differenceForUpgrade;
    return this;
  }
  WithDifferenceForDowngradeSingle(differenceForDowngrade: number): SystemBuilder {
    this.system.differenceForDowngradeSingle = differenceForDowngrade;
    return this;
  }
  WithDifferenceForDowngradeDouble(differenceForDowngrade: number): SystemBuilder {
    this.system.differenceForDowngradeDouble = differenceForDowngrade;
    return this;
  }
  WithDifferenceForDowngradeMix(differenceForDowngrade: number): SystemBuilder {
    this.system.differenceForDowngradeMix = differenceForDowngrade;
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

  WithrankingPlace(rankingPlace: RankingPlaceBuilder): SystemBuilder {
    this.rankingPlaces.push(rankingPlace);
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

  async Build(rebuild = false): Promise<RankingSystem> {
    if (this.build && !rebuild) {
      return this.system;
    }

    try {
      await this.system.save();

      for (const group of this.groups) {
        const g = await group.Build();
        await this.system.addRankingGroup(g);
      }

      for (const place of this.rankingPlaces) {
        place.WithSystemId(this.system.id);
      }

    } catch (error) {
      console.error(error);
      throw error;
    }

    this.build = true;
    return this.system;
  }
}
