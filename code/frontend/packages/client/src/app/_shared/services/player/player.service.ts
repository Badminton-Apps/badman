import { Apollo } from 'apollo-angular';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Club, CompetitionEvent, Game, Player, RankingPlace, RankingSystem, TournamentEvent } from '../../models';

import * as searchQuery from '../../graphql/players/queries/GetPlayersQuery.graphql';
import * as searchClubQuery from '../../graphql/players/queries/GetClubPlayersQuery.graphql';
import * as playerQuery from '../../graphql/players/queries/GetUserInfoQuery.graphql';
import * as playerBasicQuery from '../../graphql/players/queries/GetUserBasicInfoQuery.graphql';
import * as gamesQuery from '../../graphql/players/queries/GetUserGamesQuery.graphql';
import * as evolutionQuery from '../../graphql/players/queries/GetPlayerEvolutionQuery.graphql';
import * as getBasePlayers from '../../graphql/players/queries/GetBasePlayersQuery.graphql';

import * as addPlayerMutation from '../../graphql/players/mutations/AddPlayerMutation.graphql';
import * as updatePlayerMutation from '../../graphql/players/mutations/UpdatePlayerMutation.graphql';
import * as updatePlayerRankingMutation from '../../graphql/players/mutations/UpdatePlayerRankingMutation.graphql';
import { apolloCache as apolloCache } from 'app/graphql.module';

@Injectable({
  providedIn: 'root',
})
export class PlayerService {
  constructor(private apollo: Apollo, private httpClient: HttpClient) {}

  headerSearch(query: string) {
    return this.httpClient
      .get<{ value: Player | CompetitionEvent | TournamentEvent; type: string }[]>(
        `${environment.api}/${environment.apiVersion}/search`,
        {
          params: new HttpParams().set('query', query),
        }
      )
      .pipe(
        map((x) => { 
          return x?.map((r) => {
            if (r.type == 'Player') {
              r.value = new Player(r.value as Player);
            }
            if (r.type == 'CompetitionEvent') {
              r.value = new CompetitionEvent(r.value as CompetitionEvent);
            }
            if (r.type == 'TournamentEvent') {
              r.value = new TournamentEvent(r.value as TournamentEvent);
            }
            if (r.type == 'Club') {
              r.value = new Club(r.value as Club);
            }

            return r;
          });
        })
      );
  }

  searchPlayers(args?: { query?: string; where?: any; includeClub?: boolean; ranking?: Date }) {
    args = {
      includeClub: false,
      ...args,
    };

    return this.apollo
      .query<{ players: Player[] }>({
        query: searchQuery,
        variables: {
          where: PlayerService.playerSearchWhere(args),
          includeRanking: args?.ranking !== null,
          ranking: args?.ranking ?? null,
          includeClub: args.includeClub,
        },
      })
      .pipe(map((x) => x.data?.players?.map((r) => new Player(r))));
  }

  searchClubPlayers(clubsId: string, args?: { query?: string; where?: any; ranking?: Date }) {
    return this.apollo
      .query<{ club: { players: Player[] } }>({
        query: searchClubQuery,
        variables: {
          where: PlayerService.playerSearchWhere(args),
          id: clubsId,
          includeClub: false,
          includeRanking: args?.ranking !== null,
          ranking: args?.ranking ?? null,
        },
      })
      .pipe(map((x) => x.data?.club?.players?.map((r) => new Player(r))));
  }

  public static playerSearchWhere(args?: { query?: string; where?: any }) {
    const parts = args!
      .query!.toLowerCase()
      .replace(/[;\\\\/:*?\"<>|&',]/, ' ')
      .split(' ');
    const queries: any = [];
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

  getPlayer(id: string, rankingType?: string): Observable<Player> {
    return this.apollo
      .query({
        query: rankingType ? playerQuery : playerBasicQuery,
        variables: {
          id,
          rankingType,
        },
      })
      .pipe(map((x: any) => new Player(x.data?.player)));
  }

  getPlayerGames(
    playerId: string,
    rankingType: RankingSystem,
    offset: number,
    limit: number,
    where?: { [key: string]: any }
  ): Observable<Game[]> {
    return this.apollo
      .query({
        query: gamesQuery,
        variables: {
          playerId,
          rankingType: rankingType.id,
          offset,
          limit,
          where,
        },
        fetchPolicy: 'no-cache',
      })
      .pipe(map((x: any) => x.data?.player?.games.map((g: Partial<Game>) => new Game(g, rankingType))));
  }

  getPlayerEvolution(playerId: string, rankingType: string): Observable<RankingPlace[]> {
    return this.apollo
      .query({
        query: evolutionQuery,
        variables: {
          playerId,
          rankingType,
        },
      })
      .pipe(map((x: any) => x.data?.player?.rankingPlaces));
  }

  getTopPlayers(
    systemId: string,
    sortBy: string,
    sortOrder: string,
    date: Date,
    limit: number,
    offset: number,
    gender: string
  ) {
    const params = new HttpParams()
      .set('systemId', systemId)
      .set('sortBy', sortBy)
      .set('sortOrder', sortOrder)
      .set('date', date.toISOString())
      .set('limit', `${limit}`)
      .set('offset', `${offset}`)
      .set('gender', gender);

    return this.httpClient
      .get<{
        total: number;
        rankingPlaces: RankingPlace[];
      }>(`${environment.api}/${environment.apiVersion}/ranking/top`, {
        params: params as any,
      })
      .pipe(
        map((r) => {
          r.rankingPlaces.map((p) => {
            p.player = new Player(p.player);
            return p;
          });
          return r;
        })
      );
  }

  addPlayer(player: Partial<Player>) {
    return this.apollo
      .mutate<{ addPlayer: Player }>({
        mutation: addPlayerMutation,
        variables: {
          player,
        },
      })
      .pipe(map((x) => new Player(x.data!.addPlayer)));
  }

  updatePlayer(player: Partial<Player>) {
    return this.apollo
      .mutate<{ updatePlayer: Player }>({
        mutation: updatePlayerMutation,
        variables: {
          player,
        },
      })
      .pipe(map((r) => new Player(r.data!.updatePlayer)));
  }

  updatePlayerRanking(rankingPlace: Partial<RankingPlace>, playerId: string) {
    return this.apollo
      .mutate<{ updatePlayerRanking: Player }>({
        mutation: updatePlayerRankingMutation,
        variables: {
          rankingPlace,
          playerId,
        },
      })
      .pipe(
        tap((result) => {
          const player = result.data!.updatePlayerRanking;

          const normalizedIdPlayer = apolloCache.identify({ id: player?.id, __typename: 'Player' });
          apolloCache.evict({ id: normalizedIdPlayer });

          // Clear from cache
          const normalizedIdLastRanking = apolloCache.identify({
            id: player.lastRanking?.id,
            __typename: 'LastRankingPlace',
          });
          apolloCache.evict({ id: normalizedIdLastRanking });

          for (const ranking of player.rankingPlaces ?? []) {
            const normalizedId = apolloCache.identify({ id: ranking?.id, __typename: 'RankingPlace' });
            apolloCache.evict({ id: normalizedId });
          }

          apolloCache.gc();
        })
      );
  }

  getBasePlayers(clubId: String, type: String) {
    return this.apollo.query<{ club: Club }>({
      query: getBasePlayers,
      variables: {
        type,
        clubId,
      },
    });
  }
}
