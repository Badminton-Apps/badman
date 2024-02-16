export const sortStanding = (
  a: {
    points?: number;
    won?: number;
    lost?: number;
    gamesWon?: number;
    gamesLost?: number;
    setsWon?: number;
    setsLost?: number;
    totalPointsWon?: number;
    totalPointsLost?: number;
  },
  b: {
    points?: number;
    won?: number;
    lost?: number;
    gamesWon?: number;
    gamesLost?: number;
    setsWon?: number;
    setsLost?: number;
    totalPointsWon?: number;
    totalPointsLost?: number;
  },
) => {
  const nonOptionalA = {
    points: a?.points || 0,
    won: a?.won || 0,
    lost: a?.lost || 0,
    gamesWon: a?.gamesWon || 0,
    gamesLost: a?.gamesLost || 0,
    setsWon: a?.setsWon || 0,
    setsLost: a?.setsLost || 0,
    totalPointsWon: a?.totalPointsWon || 0,
    totalPointsLost: a?.totalPointsLost || 0,
  };

  const nonOptionalB = {
    points: b?.points || 0,
    won: b?.won || 0,
    lost: b?.lost || 0,
    gamesWon: b?.gamesWon || 0,
    gamesLost: b?.gamesLost || 0,
    setsWon: b?.setsWon || 0,
    setsLost: b?.setsLost || 0,
    totalPointsWon: b?.totalPointsWon || 0,
    totalPointsLost: b?.totalPointsLost || 0,
  };

  if (nonOptionalA.points > nonOptionalB.points) {
    return -1;
  } else if (nonOptionalA.points < nonOptionalB.points) {
    return 1;
  }

  if (nonOptionalA.won > nonOptionalB.won) {
    return -1;
  } else if (nonOptionalA.won < nonOptionalB.won) {
    return 1;
  }

  if (nonOptionalA.won - nonOptionalA.lost > nonOptionalB.won - nonOptionalB.lost) {
    return -1;
  } else if (nonOptionalA.won - nonOptionalA.lost < nonOptionalB.won - nonOptionalB.lost) {
    return 1;
  }

  if (
    nonOptionalA.gamesWon - nonOptionalA.gamesLost >
    nonOptionalB.gamesWon - nonOptionalB.gamesLost
  ) {
    return -1;
  } else if (
    nonOptionalA.gamesWon - nonOptionalA.gamesLost <
    nonOptionalB.gamesWon - nonOptionalB.gamesLost
  ) {
    return 1;
  }

  if (nonOptionalA.setsWon - nonOptionalA.setsLost > nonOptionalB.setsWon - nonOptionalB.setsLost) {
    return -1;
  } else if (
    nonOptionalA.setsWon - nonOptionalA.setsLost <
    nonOptionalB.setsWon - nonOptionalB.setsLost
  ) {
    return 1;
  }

  if (
    nonOptionalA.totalPointsWon - nonOptionalA.totalPointsLost >
    nonOptionalB.totalPointsWon - nonOptionalB.totalPointsLost
  ) {
    return -1;
  } else if (
    nonOptionalA.totalPointsWon - nonOptionalA.totalPointsLost <
    nonOptionalB.totalPointsWon - nonOptionalB.totalPointsLost
  ) {
    return 1;
  }

  return 0;
};
