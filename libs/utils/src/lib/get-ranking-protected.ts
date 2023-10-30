export function getRankingProtected<
  T extends {
    single?: number | null;
    double?: number | null;
    mix?: number | null;
  },
  S extends Partial<{
    amountOfLevels?: number;
    maxDiffLevels?: number;
  }>,
>(ranking: T, system: S): T {
  // Create object if no ranking is provided
  if (!ranking) {
    ranking = {} as T;
  }

  // if no system is provided, throw an error
  if (!system.amountOfLevels) {
    throw new Error('No amount of levels provided');
  }

  if (!system.maxDiffLevels) {
    throw new Error('No max diff levels provided');
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
