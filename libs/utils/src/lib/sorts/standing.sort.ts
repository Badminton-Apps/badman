export const sortStanding = (a: Partial<SortStandingType>, b: Partial<SortStandingType>) => {
  // Based on C320 - Article 31

  const wonA = a.won ?? 0;
  const wonB = b.won ?? 0;

  if (wonA !== wonB) {
    return wonB - wonA; // higher number of wins comes first
  }

  const tiedA = a.tied ?? 0;
  const tiedB = b.tied ?? 0;

  return tiedB - tiedA; // higher number of ties comes next
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
