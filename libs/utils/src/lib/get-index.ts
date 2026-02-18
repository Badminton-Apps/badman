import { SubEventTypeEnum } from "./enums";

export interface IndexPlayer {
  id?: string;
  single: number;
  double: number;
  mix: number;
  gender: "M" | "F";
}

// Helper functions to calculate ranking sums
const sumNonMixed = (player: Partial<IndexPlayer>, defaultRanking: number): number =>
  (player.single ?? defaultRanking) + (player.double ?? defaultRanking);

const sumMixed = (player: Partial<IndexPlayer>, defaultRanking: number): number =>
  (player.single ?? defaultRanking) + (player.double ?? defaultRanking) + (player.mix ?? defaultRanking);

export const getIndexFromPlayers = (
  type: SubEventTypeEnum,
  players: Partial<IndexPlayer>[],
  defaultRanking = 12
) => {
  const rankings: Partial<IndexPlayer>[] = [];

  for (const p of players) {
    if (p && "lastRanking" in p) {
      if (!p.gender) {
        throw new Error(`Player ${p.id} has no gender`);
      }

      rankings.push({
        id: p.id,
        single: p.single ?? defaultRanking,
        double: p.double ?? defaultRanking,
        mix: p.mix ?? defaultRanking,
        gender: p.gender,
      });
    } else {
      rankings.push(p);
    }
  }

  if (type !== "MX") {
    const bestPlayers = getBestPlayers(type, rankings, defaultRanking)?.map((p) =>
      sumNonMixed(p, defaultRanking)
    );
    let missingIndex = 0;
    if (bestPlayers.length < 4) {
      missingIndex = (4 - bestPlayers.length) * 24;
    }

    return bestPlayers.reduce((a, b) => a + b, missingIndex);
  } else {
    const bestPlayers = getBestPlayers(type, rankings, defaultRanking)?.map((p) =>
      sumMixed(p, defaultRanking)
    );

    let missingIndex = 0;
    if (bestPlayers.length < 4) {
      missingIndex = (4 - bestPlayers.length) * 36;
    }

    return bestPlayers.reduce((a, b) => a + b, missingIndex);
  }
};

export const getBestPlayers = (
  type: SubEventTypeEnum,
  players: Partial<IndexPlayer>[],
  defaultRanking = 12
) => {
  if (type !== "MX") {
    // For non-MX teams, index only uses single + double, so sort by same criteria
    const bestPlayers = players
      ?.sort((a, b) => sumNonMixed(a, defaultRanking) - sumNonMixed(b, defaultRanking))
      ?.slice(0, 4);

    return bestPlayers;
  } else {
    const bestPlayersMale = players
      ?.filter((p) => p?.gender == "M")
      ?.sort((a, b) => sumMixed(a, defaultRanking) - sumMixed(b, defaultRanking))
      ?.slice(0, 2);

    const bestPlayersFemale = players
      ?.filter((p) => p?.gender == "F")
      ?.sort((a, b) => sumMixed(a, defaultRanking) - sumMixed(b, defaultRanking))
      ?.slice(0, 2);

    const bestPlayers = [...bestPlayersMale, ...bestPlayersFemale];

    return bestPlayers;
  }
};

export const getBestPlayersFromTeam = (
  type: SubEventTypeEnum,
  rankings: Partial<IndexPlayer>[],
  defaultRanking = 12
) => {
  if (type !== "MX") {
    const bestPlayers = getBestPlayers(type, rankings, defaultRanking);
    const bestRankings = bestPlayers?.map((p) => sumNonMixed(p, defaultRanking));

    let missingIndex = 0;
    if (bestPlayers.length < 4) {
      missingIndex = (4 - bestPlayers.length) * 24;
    }

    return {
      players: bestPlayers,
      index: bestRankings.reduce((a, b) => a + b, missingIndex),
    };
  } else {
    const bestPlayers = getBestPlayers(type, rankings, defaultRanking);
    const bestRankings = bestPlayers?.map((p) => sumMixed(p, defaultRanking));

    let missingIndex = 0;
    if (bestPlayers.length < 4) {
      missingIndex = (4 - bestPlayers.length) * 36;
    }

    return {
      players: bestPlayers,
      index: bestRankings.reduce((a, b) => a + b, missingIndex),
    };
  }
};
