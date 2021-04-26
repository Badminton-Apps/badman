import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Game, Player, RankingPlace, RankingSystem } from '../../models';

import * as searchQuery from '../../graphql/players/queries/GetPlayersQuery.graphql';
import * as searchClubQuery from '../../graphql/players/queries/GetClubPlayersQuery.graphql';
import * as playerQuery from '../../graphql/players/queries/GetUserInfoQuery.graphql';
import * as playerBasicQuery from '../../graphql/players/queries/GetUserBasicInfoQuery.graphql';
import * as gamesQuery from '../../graphql/players/queries/GetUserGamesQuery.graphql';
import * as evolutionQuery from '../../graphql/players/queries/GetPlayerEvolutionQuery.graphql';

import * as addPlayerMutation from '../../graphql/players/mutations/AddPlayerMutation.graphql';
import * as updatePlayerMutation from '../../graphql/players/mutations/UpdatePlayerMutation.graphql';
import * as updatePlayerRankingMutation from '../../graphql/players/mutations/UpdatePlayerRankingMutation.graphql';

@Injectable({
  providedIn: 'root',
})
export class PlayerService {
  constructor(private apollo: Apollo, private httpClient: HttpClient) {}

  searchPlayers(args?: { query?: string; where?: any; includeClub?: boolean }) {
    args = {
      includeClub: false,
      ...args,
    };

    return this.apollo
      .query<{ players: Player[] }>({
        query: searchQuery,
        variables: {
          where: this._searchPlayer(args),
          includeClub: args.includeClub,
        },
      })
      .pipe(map((x) => x.data?.players?.map((r) => new Player(r))));
  }

  searchClubPlayers(clubsId: string, args?: { query?: string; where?: any }) {
    return this.apollo
      .query<{ club: { players: Player[] } }>({
        query: searchClubQuery,
        variables: {
          where: this._searchPlayer(args),
          id: clubsId,
          includeClub: false,
        },
      })
      .pipe(map((x) => x.data?.club?.players?.map((r) => new Player(r))));
  }

  private _searchPlayer(args?: { query?: string; where?: any }) {
    const parts = args.query
      .toLowerCase()
      .replace(/[;\\\\/:*?\"<>|&',]/, ' ')
      .split(' ');
    const queries = [];
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
      ...args.where,
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
    limit: number
  ): Observable<Game[]> {
    return this.apollo
      .query({
        query: gamesQuery,
        variables: {
          playerId,
          rankingType: rankingType.id,
          offset,
          limit,
        },
      })
      .pipe(
        map((x: any) =>
          x.data?.player?.games.map(
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
      .pipe(map((x) => new Player(x.data.addPlayer)));
  }

  updatePlayer(player: Partial<Player>) {
    return this.apollo
      .mutate<{ updatePlayer: Player }>({
        mutation: updatePlayerMutation,
        variables: {
          player,
        },
      })
      .pipe(map((r) => new Player(r.data.updatePlayer)));
  }

  updatePlayerRanking(rankingPlace: RankingPlace) {
    return this.apollo.mutate<{ updatePlayer: Player }>({
      mutation: updatePlayerRankingMutation,
      variables: {
        rankingPlace,
      },
    });
  }
}
