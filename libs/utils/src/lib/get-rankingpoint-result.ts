export const getGameResultType = (
  won: boolean,
  rankingPoint?: Partial<{
    differenceInLevel?: number;
    system?: {
      differenceForUpgrade?: number;
      differenceForDowngrade?: number;
    };
  }>
): GameBreakdownType => {
  if (won) {
    return GameBreakdownType.WON;
  } else {

    const upgrade =
      (rankingPoint?.differenceInLevel ?? 0) >=
      (rankingPoint?.system?.differenceForUpgrade ?? 0) * -1;
    const downgrade =
      (rankingPoint?.differenceInLevel ?? 0) >=
      (rankingPoint?.system?.differenceForDowngrade ?? 0) * -1;

    if (downgrade) {
      return GameBreakdownType.LOST_DOWNGRADE;
    } else if (upgrade) {
      return GameBreakdownType.LOST_UPGRADE;
    } else {
      return GameBreakdownType.LOST_IGNORED;
    }
  }
}

export enum GameBreakdownType {
  WON = 'WON',
  LOST_UPGRADE = 'LOST_UPGRADE',
  LOST_DOWNGRADE = 'LOST_DOWNGRADE',
  LOST_IGNORED = 'LOST_IGNORED',
  OUT_SCOPE = 'OUT_SCOPE',
}
