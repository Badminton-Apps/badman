export const sortTeams = (
  a?: Partial<{ type: string; teamNumber: number; name: string }>,
  b?: Partial<{ type: string; teamNumber: number; name: string }>,
) => {
  if (!a) {
    return 1;
  }

  if (!b) {
    return -1;
  }

  if (a.type === b.type) {
    return (a.teamNumber ?? 0) - (b.teamNumber ?? 0);
  }

  return (a.type ?? a.name ?? '').localeCompare(b.type ?? b.name ?? '');
};
