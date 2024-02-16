import { SubEventTypeEnum } from './enums';

export interface IndexPlayer {
  id?: string;
  single: number;
  double: number;
  mix: number;
  gender: 'M' | 'F';
}
export const getIndexFromPlayers = (type: SubEventTypeEnum, players: Partial<IndexPlayer>[]) => {
  const rankings: Partial<IndexPlayer>[] = [];

  for (const p of players) {
    if (p && 'lastRanking' in p) {
      if (!p.gender) {
        throw new Error(`Player ${p.id} has no gender`);
      }

      rankings.push({
        id: p.id,
        single: p.single ?? 12,
        double: p.double ?? 12,
        mix: p.mix ?? 12,
        gender: p.gender,
      });
    } else {
      rankings.push(p);
    }
  }

  if (type !== 'MX') {
    const bestPlayers = getBestPlayers(type, rankings)?.map(
      (r) => (r?.single ?? 12) + (r?.double ?? 12),
    );
    let missingIndex = 0;
    if (bestPlayers.length < 4) {
      missingIndex = (4 - bestPlayers.length) * 24;
    }

    return bestPlayers.reduce((a, b) => a + b, missingIndex);
  } else {
    const bestPlayers = getBestPlayers(type, rankings)?.map(
      (r) => (r?.single ?? 12) + (r?.double ?? 12) + (r?.mix ?? 12),
    );

    let missingIndex = 0;
    if (bestPlayers.length < 4) {
      missingIndex = (4 - bestPlayers.length) * 36;
    }

    return bestPlayers.reduce((a, b) => a + b, missingIndex);
  }
};

export const getBestPlayers = (type: SubEventTypeEnum, players: Partial<IndexPlayer>[]) => {
  if (type !== 'MX') {
    const bestPlayers = players
      ?.sort((a, b) => {
        const aSum = (a.single ?? 12) + (a.double ?? 12) + (a.mix ?? 12);
        const bSum = (b.single ?? 12) + (b.double ?? 12) + (b.mix ?? 12);

        return aSum - bSum;
      })
      ?.slice(0, 4);

    return bestPlayers;
  } else {
    const bestPlayersMale = players
      ?.filter((p) => p?.gender == 'M')
      ?.sort((a, b) => {
        const aSum = (a.single ?? 12) + (a.double ?? 12) + (a.mix ?? 12);
        const bSum = (b.single ?? 12) + (b.double ?? 12) + (b.mix ?? 12);

        return aSum - bSum;
      })
      ?.slice(0, 2);

    const bestPlayersFemale = players
      ?.filter((p) => p?.gender == 'F')
      ?.sort((a, b) => {
        const aSum = (a.single ?? 12) + (a.double ?? 12) + (a.mix ?? 12);
        const bSum = (b.single ?? 12) + (b.double ?? 12) + (b.mix ?? 12);

        return aSum - bSum;
      })
      ?.slice(0, 2);

    const bestPlayers = [...bestPlayersMale, ...bestPlayersFemale];

    return bestPlayers;
  }
};

export const getBestPlayersFromTeam = (
  type: SubEventTypeEnum,
  rankings: Partial<IndexPlayer>[],
) => {
  if (type !== 'MX') {
    const bestPlayers = getBestPlayers(type, rankings);
    const bestRankings = bestPlayers?.map((r) => (r?.single ?? 12) + (r?.double ?? 12));

    let missingIndex = 0;
    if (bestPlayers.length < 4) {
      missingIndex = (4 - bestPlayers.length) * 24;
    }

    return {
      players: bestPlayers,
      index: bestRankings.reduce((a, b) => a + b, missingIndex),
    };
  } else {
    const bestPlayers = getBestPlayers(type, rankings);
    const bestRankings = bestPlayers?.map(
      (r) => (r?.single ?? 12) + (r?.double ?? 12) + (r?.mix ?? 12),
    );

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
