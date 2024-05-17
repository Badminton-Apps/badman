export const sortStanding = (a: Partial<SortStandingType>, b: Partial<SortStandingType>) => {
  const teamA = {
    points: a?.points || 0,
    won: a?.won || 0,
    tied: a?.tied || 0,
    lost: a?.lost || 0,
    gamesWon: a?.gamesWon || 0,
    gamesLost: a?.gamesLost || 0,
    setsWon: a?.setsWon || 0,
    setsLost: a?.setsLost || 0,
    totalPointsWon: a?.totalPointsWon || 0,
    totalPointsLost: a?.totalPointsLost || 0,
  };

  const teamB = {
    points: b?.points || 0,
    won: b?.won || 0,
    tied: b?.tied || 0,
    lost: b?.lost || 0,
    gamesWon: b?.gamesWon || 0,
    gamesLost: b?.gamesLost || 0,
    setsWon: b?.setsWon || 0,
    setsLost: b?.setsLost || 0,
    totalPointsWon: b?.totalPointsWon || 0,
    totalPointsLost: b?.totalPointsLost || 0,
  };

  if (teamA.points > teamB.points) {
    return -1;
  } else if (teamA.points < teamB.points) {
    return 1;
  }

  if (teamA.won - teamA.lost > teamB.won - teamB.lost) {
    return -1;
  } else if (teamA.won - teamA.lost < teamB.won - teamB.lost) {
    return 1;
  }

  if (teamA.tied > teamB.tied) {
    return -1;
  } else if (teamA.tied < teamB.tied) {
    return 1;
  }

  if (teamA.gamesWon - teamA.gamesLost > teamB.gamesWon - teamB.gamesLost) {
    return -1;
  } else if (teamA.gamesWon - teamA.gamesLost < teamB.gamesWon - teamB.gamesLost) {
    return 1;
  }

  if (teamA.totalPointsWon - teamA.totalPointsLost > teamB.totalPointsWon - teamB.totalPointsLost) {
    return -1;
  } else if (
    teamA.totalPointsWon - teamA.totalPointsLost <
    teamB.totalPointsWon - teamB.totalPointsLost
  ) {
    return 1;
  }

  return 0;
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
