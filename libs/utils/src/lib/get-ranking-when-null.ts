export function getRankingWhenNull<
  T extends {
    single?: number;
    double?: number;
    mix?: number;
  },
  S extends Partial<{
    amountOfLevels?: number;
    maxDiffLevels?: number;
  }>,
>(ranking: T, system: S): T {
  // if no ranking has null values, return the ranking
  if (ranking.single && ranking.double && ranking.mix) {
    return ranking;
  }

  // if no system is provided, throw an error
  if (!system.amountOfLevels || !system.maxDiffLevels) {
    throw new Error('No system provided');
  }

  ranking.single = ranking.single || system.amountOfLevels;
  ranking.double = ranking.double || system.amountOfLevels;
  ranking.mix = ranking.mix || system.amountOfLevels;

  const highest = Math.min(ranking.single, ranking.double, ranking.mix);

  if (ranking.single - highest >= (system.maxDiffLevels ?? 0)) {
    ranking.single = highest + (system.maxDiffLevels ?? 0);
  }
  if (ranking.double - highest >= (system.maxDiffLevels ?? 0)) {
    ranking.double = highest + (system.maxDiffLevels ?? 0);
  }
  if (ranking.mix - highest >= (system.maxDiffLevels ?? 0)) {
    ranking.mix = highest + (system.maxDiffLevels ?? 0);
  }

  if (ranking.single > system.amountOfLevels) {
    ranking.single = system.amountOfLevels;
  }
  if (ranking.double > system.amountOfLevels) {
    ranking.double = system.amountOfLevels;
  }
  if (ranking.mix > system.amountOfLevels) {
    ranking.mix = system.amountOfLevels;
  }

  return ranking;
}
