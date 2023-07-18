export const sortPlaces = (
  a?: Partial<{
    rankingDate: Date;
  }>,
  b?: Partial<{
    rankingDate: Date;
  }>,
  order: 'asc' | 'desc' = 'desc'
) => {
  if (!a?.rankingDate) {
    return 1;
  }

  if (!b?.rankingDate) {
    return -1;
  }

  if (a.rankingDate < b.rankingDate) {
    return order === 'asc' ? -1 : 1;
  } else if (a.rankingDate > b.rankingDate) {
    return order === 'asc' ? 1 : -1;
  } else {
    return 0;
  }
};
