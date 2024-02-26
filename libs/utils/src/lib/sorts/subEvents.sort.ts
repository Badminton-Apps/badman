export const sortSubEvents = (
  a: Partial<{ eventType: string; level: number }>,
  b: Partial<{ eventType: string; level: number }>,
) => {
  if (a.eventType === b.eventType) {
    return (a.level ?? 0) - (b.level ?? 0);
  }

  return (a.eventType ?? '').localeCompare(b.eventType ?? '');
};
