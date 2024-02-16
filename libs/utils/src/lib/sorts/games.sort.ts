export const sortGames = (
  a: Partial<{
    playedAt: Date;
  }>,
  b: Partial<{
    playedAt: Date;
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
    return 0;
  }
};
