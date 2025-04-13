export const sortStanding = (a: Partial<SortStandingType>, b: Partial<SortStandingType>) => {
  const aScore = (a.won ?? 0) - (a.lost ?? 0) - (a.tied ?? 0);
  const bScore = (b.won ?? 0) - (b.lost ?? 0) - (b.tied ?? 0);
  return bScore - aScore;
};

type SortStandingType = {
  points: number;
  won: number;
  tied: number;
  lost: number;
  gamesWon: number;
  gamesLost: number;
  setsWon: number;
  setsLost: number;
  totalPointsWon: number;
  totalPointsLost: number;
};
