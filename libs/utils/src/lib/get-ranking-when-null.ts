export const getRankingWhenNull = (
  ranking: Partial<{
    single?: number | null;
    double?: number | null;
    mix?: number | null;
  }>,
  maxlevel: number
) => {
  /* 
    when a player has no value for any given ranking use the lowest single, double or mix +2,
    however this can never be higher then the maxLevel
    If you are 1 below the max level you can also no go lower then that value

    if the maxLevel is 12
    if your lowest level is anywhere below `maxLevel-2` then you will be that value +2 
    if your lowest level in any given ranking is `maxLevel-2` then you can not go higher then `maxLevel-1`
    if your lowest level in any given ranking is `maxLevel-1` in any given ranking you can not go higher then `maxLevel-1`
    and if you are `maxLevel` in all ranking you will be `maxLevel`

  */
  const lowestRanking = Math.min(
    ranking.single ?? maxlevel + 2,
    ranking.double ?? maxlevel + 2,
    ranking.mix ?? maxlevel + 2
  );

  const originalRanking = { ...ranking };

  if (lowestRanking <= maxlevel - 2) {
    ranking.single = originalRanking.single ?? lowestRanking + 2;
    ranking.double = originalRanking.double ?? lowestRanking + 2;
    ranking.mix = originalRanking.mix ?? lowestRanking + 2;
  } else if (lowestRanking === maxlevel - 1) {
    const newRanking = maxlevel - 1;
    ranking.single = originalRanking.single ?? newRanking;
    ranking.double = originalRanking.double ?? newRanking;
    ranking.mix = originalRanking.mix ?? newRanking;
  } else if (lowestRanking === maxlevel) {
    ranking.single = originalRanking.single ?? maxlevel;
    ranking.double = originalRanking.double ?? maxlevel;
    ranking.mix = originalRanking.mix ?? maxlevel;
  }

  
  return ranking;
};
