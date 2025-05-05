export const sortStanding = (a: Partial<SortStandingType>, b: Partial<SortStandingType>) => {
  // Based on C320 - Article 61
  const pointA = a.points ?? 0;
  const pointB = b.points ?? 0;

  if (pointA !== pointB) {
    return pointB - pointA; // higher number of points comes first
  }

  const wonA = a.won ?? 0;
  const wonB = b.won ?? 0;

  if (wonA !== wonB) {
    return wonB - wonA; // higher number of wins comes first
  }

  const saldoA = (a.gamesWon ?? 0) - (a.gamesLost ?? 0);
  const saldoB = (b.gamesWon ?? 0) - (b.gamesLost ?? 0);

  if (saldoA !== saldoB) {
    return saldoB - saldoA; // higher number of saldo comes first
  }

  const setsWonA = a.setsWon ?? 0;
  const setsWonB = b.setsWon ?? 0;

  return setsWonB - setsWonA; // higher number of sets won comes first
};

type SortStandingType = {
  points: number | null;
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
