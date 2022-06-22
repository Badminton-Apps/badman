import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { apolloCache } from '../../../graphql.module';
import * as addPlayerMutation from '../../graphql/players/mutations/AddPlayerMutation.graphql';
import * as updatePlayerMutation from '../../graphql/players/mutations/UpdatePlayerMutation.graphql';
import * as getBasePlayers from '../../graphql/players/queries/GetBasePlayersQuery.graphql';
import * as searchClubQuery from '../../graphql/players/queries/GetClubPlayersQuery.graphql';
import * as evolutionQuery from '../../graphql/players/queries/GetPlayerEvolutionQuery.graphql';
import * as searchQuery from '../../graphql/players/queries/GetPlayersQuery.graphql';
import * as playerBasicQuery from '../../graphql/players/queries/GetUserBasicInfoQuery.graphql';
import * as gamesQuery from '../../graphql/players/queries/GetUserGamesQuery.graphql';
import {
  Club,
  EventCompetition,
  Game,
  Player,
  RankingPlace,
  RankingSystem,
  EventTournament,
} from '../../models';

@Injectable({
  providedIn: 'root',
})
export class PlayerService {
  public static playerSearchWhere(args?: { query?: string; where?: any }) {
    const parts = args?.query
      ?.toLowerCase()
      .replace(/[;\\\\/:*?"<>|&',]/, ' ')
      .split(' ');
    const queries: any = [];
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

  headerSearch(query: string) {
    return this.httpClient
      .get<
        { value: Player | EventCompetition | EventTournament; type: string }[]
      >(`${environment.api}/api/${environment.apiVersion}/search`, {
        params: new HttpParams().set('query', query),
      })
      .pipe(
        map((x) => {
          return x?.map((r) => {
            if (r.type == 'Player') {
              r.value = new Player(r.value as Player);
            }
            if (r.type == 'CompetitionEvent') {
              r.value = new EventCompetition(r.value as EventCompetition);
            }
            if (r.type == 'TournamentEvent') {
              r.value = new EventTournament(r.value as EventTournament);
            }
            if (r.type == 'Club') {
              r.value = new Club(r.value as Club);
            }

            return r;
          });
        })
      );
  }

  searchPlayers(args?: {
    query?: string;
    where?: any;
    includeClub?: boolean;
    ranking?: Date;
  }) {
    args = {
      includeClub: false,
      ...args,
    };

    return this.apollo
      .query<{ players: {rows: Player[]} }>({
        query: searchQuery,
        variables: {
          where: PlayerService.playerSearchWhere(args),
          includeRanking: args?.ranking !== null,
          ranking: args?.ranking ?? null,
          includeClub: args.includeClub,
        },
      })
      .pipe(map((x) => x.data?.players?.rows?.map((r) => new Player(r))));
  }

  searchClubPlayers(
    clubsId: string,
    args?: { query?: string; where?: any; ranking?: Date; personal?: boolean }
  ) {
    return this.apollo
      .query<{ club: { players: Player[] } }>({
        query: searchClubQuery,
        variables: {
          where: PlayerService.playerSearchWhere(args),
          id: clubsId,
          includeClub: false,
          includeRanking: args?.ranking !== null,
          ranking: args?.ranking ?? null,
          personal: args?.personal ?? false,
        },
      })
      .pipe(map((x) => x.data?.club?.players?.map((r) => new Player(r))));
  }

  getPlayer(id?: string): Observable<Player> {
    return this.apollo
      .query({
        query: playerBasicQuery,
        variables: {
          id,
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
          system: rankingType.id,
          offset,
          limit,
          where,
        },
        fetchPolicy: 'no-cache',
      })
      .pipe(
        map((x: any) =>
          x.data?.player?.games?.map(
            (g: Partial<Game>) => new Game(g, rankingType)
          )
        )
      );
  }

  getPlayerEvolution(
    playerId: string,
    rankingType: string
  ): Observable<RankingPlace[]> {
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
      }>(`${environment.api}/api/${environment.apiVersion}/ranking/top`, {
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
      .pipe(map((x) => new Player(x.data?.addPlayer)));
  }

  updatePlayer(player: Partial<Player>) {
    return this.apollo
      .mutate<{ updatePlayer: Player }>({
        mutation: updatePlayerMutation,
        variables: {
          data: player,
        },
      })
      .pipe(map((r) => new Player(r.data?.updatePlayer)));
  }


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
