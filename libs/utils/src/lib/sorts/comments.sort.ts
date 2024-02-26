export const sortComments = (
  a?: Partial<{
    createdAt: Date;
  }>,
  b?: Partial<{
    createdAt: Date;
  }>,
  order: 'asc' | 'desc' = 'desc',
) => {
  if (!a?.createdAt) {
    return 1;
  }

  if (!b?.createdAt) {
    return -1;
  }

  if (a.createdAt < b.createdAt) {
    return order === 'asc' ? -1 : 1;
  } else if (a.createdAt > b.createdAt) {
    return order === 'asc' ? 1 : -1;
  } else {
    return 0;
  }
};
