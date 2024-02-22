import { GameType } from '../enums';

export const sortGames = (
  a: Partial<{
    playedAt: Date;
    gameType: GameType;
  }>,
  b: Partial<{
    playedAt: Date;
    gameType: GameType;
  }>,
  order: 'asc' | 'desc' = 'desc',
) => {
  if (!a.playedAt) {
    return 1;
  }

  if (!b.playedAt) {
    return -1;
  }

  if (a.playedAt < b.playedAt) {
    return order === 'asc' ? -1 : 1;
  } else if (a.playedAt > b.playedAt) {
    return order === 'asc' ? 1 : -1;
  } else {
    // GameType.S is always the last one
    if (a.gameType === GameType.S && b.gameType !== GameType.S) {
      return 1;
    }

    if (a.gameType !== GameType.S && b.gameType === GameType.S) {
      return -1;
    }

    return 0;
  }
};
