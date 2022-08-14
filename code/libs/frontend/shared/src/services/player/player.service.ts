import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { apolloCache } from '@badman/frontend/graphql';
import { Apollo } from 'apollo-angular';
import * as getBasePlayers from '../../graphql/players/queries/GetBasePlayersQuery.graphql';
import { Club, Player } from '@badman/frontend/models';

@Injectable({
  providedIn: 'root',
})
export class PlayerService {
  public static playerSearchWhere(args?: {
    query?: string;
    where?: { [key: string]: unknown };
  }) {
    const parts = args?.query
      ?.toLowerCase()
      .replace(/[;\\\\/:*?"<>|&',]/, ' ')
      .split(' ');
    const queries: unknown[] = [];
    if (!parts) {
      return;
    }
    for (const part of parts) {
      queries.push({
        $or: [
          { firstName: { $iLike: `%${part}%` } },
          { lastName: { $iLike: `%${part}%` } },
          { memberId: { $iLike: `%${part}%` } },
        ],
      });
    }

    return {
      $and: queries,
      ...args?.where,
    };
  }

  constructor(private apollo: Apollo, private httpClient: HttpClient) {}

  invalidatePlayerRanking(player: Player) {
    const normalizedIdPlayer = apolloCache.identify({
      id: player?.id,
      __typename: 'Player',
    });
    apolloCache.evict({ id: normalizedIdPlayer });

    // Clear from cache
    const normalizedIdLastRanking = apolloCache.identify({
      id: player?.lastRanking?.id,
      __typename: 'RankingLastPlace',
    });
    apolloCache.evict({ id: normalizedIdLastRanking });

    for (const ranking of player?.rankingPlaces ?? []) {
      const normalizedId = apolloCache.identify({
        id: ranking?.id,
        __typename: 'RankingPlace',
      });
      apolloCache.evict({ id: normalizedId });
    }

    apolloCache.gc();
  }

  getBasePlayers(clubId: string, type: string) {
    return this.apollo.query<{ club: Club }>({
      query: getBasePlayers,
      variables: {
        type,
        clubId,
      },
    });
  }
}
