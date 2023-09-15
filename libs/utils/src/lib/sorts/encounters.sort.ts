export const sortEncounters = (
  a: Partial<{
    date: Date;
  }>,
  b: Partial<{
    date: Date;
  }>,
  order: 'asc' | 'desc' = 'asc'
) => {
  if (!a.date) {
    return 1;
  }

  if (!b.date) {
    return -1;
  }

  if (a.date < b.date) {
    return order === 'asc' ? -1 : 1;
  } else if (a.date > b.date) {
    return order === 'asc' ? 1 : -1;
  } else {
    return 0;
  }
};
