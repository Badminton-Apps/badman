import { GameType } from './enums';

export const getGameResultType = (
  won: boolean,
  gameType: GameType,
  rankingPoint?: Partial<{
    differenceInLevel?: number;
    system?: {
      differenceForUpgradeSingle?: number;
      differenceForUpgradeDouble?: number;
      differenceForUpgradeMix?: number;
      differenceForDowngradeSingle?: number;
      differenceForDowngradeDouble?: number;
      differenceForDowngradeMix?: number;
    };
  }>,
): GameBreakdownType => {
  if (won) {
    return GameBreakdownType.WON;
  } else {
    const propDowngrade =
      gameType === GameType.S
        ? 'differenceForDowngradeSingle'
        : gameType === GameType.D
        ? 'differenceForDowngradeDouble'
        : 'differenceForDowngradeMix';

    const propUpgrade =
      gameType === GameType.S
        ? 'differenceForUpgradeSingle'
        : gameType === GameType.D
        ? 'differenceForUpgradeDouble'
        : 'differenceForUpgradeMix';

    const upgrade =
      (rankingPoint?.differenceInLevel ?? 0) >=
      (rankingPoint?.system?.[propUpgrade] ?? 0) * -1;
    const downgrade =
      (rankingPoint?.differenceInLevel ?? 0) >=
      (rankingPoint?.system?.[propDowngrade] ?? 0) * -1;

    if (downgrade) {
      return GameBreakdownType.LOST_DOWNGRADE;
    } else if (upgrade) {
      return GameBreakdownType.LOST_UPGRADE;
    } else {
      return GameBreakdownType.LOST_IGNORED;
    }
  }
};

export enum GameBreakdownType {
  WON = 'WON',
  LOST_UPGRADE = 'LOST_UPGRADE',
  LOST_DOWNGRADE = 'LOST_DOWNGRADE',
  LOST_IGNORED = 'LOST_IGNORED',
  OUT_SCOPE = 'OUT_SCOPE',
}
