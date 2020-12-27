import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Game, Player, RankingPlace } from '../../models';

const searchQuery = require('graphql-tag/loader!../../graphql/players/queries/GetPlayersQuery.graphql');
const playerQuery = require('graphql-tag/loader!../../graphql/players/queries/GetUserInfoQuery.graphql');
const gamesQuery = require('graphql-tag/loader!../../graphql/players/queries/GetUserGamesQuery.graphql');
const evolutionQuery = require('graphql-tag/loader!../../graphql/players/queries/GetPlayerEvolutionQuery.graphql');

@Injectable({
  providedIn: 'root',
})
export class PlayerService {
  constructor(private apollo: Apollo, private httpClient: HttpClient) {}

  searchPlayers(query: string) {
    return this.apollo
      .query({
        query: searchQuery,
        variables: {
          search: query,
        },
      })
      .pipe(map((x) => x.data));
  }

  getPlayer(id: string, rankingType: number): Observable<Player> {
    return this.apollo
      .query({
        query: playerQuery,
        variables: {
          id,
          rankingType,
        },
      })
      .pipe(
        map((x) => x.data),
        map((x: any) => {
          if (!x?.player) return x.player;
          return {
            ...x.player,
            id: parseInt(x.player.id, 10),
          };
        })
      );
  }
  getPlayerGames(
    playerId: string,
    rankingType: number,
    offset: number,
    limit: number
  ): Observable<Game[]> {
    return this.apollo
      .query({
        query: gamesQuery,
        variables: {
          playerId,
          rankingType,
          offset,
          limit,
        },
      })
      .pipe(map((x: any) => x.data?.player?.games));
  }

  getPlayerEvolution(
    playerId: string,
    rankingType: number
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
    systemId: number,
    sortBy: string,
    sortOrder: string,
    date: Date,
    limit: number,
    offset: number,
    gender: string
  ) {
    const params = new HttpParams()
      .set('systemId', `${systemId}`)
      .set('sortBy', sortBy)
      .set('sortOrder', sortOrder)
      .set('date', date.toISOString())
      .set('limit', `${limit}`)
      .set('offset', `${offset}`)
      .set('gender', gender);

    return this.httpClient.get<{
      total: number;
      rankingPlaces: RankingPlace[];
    }>(`${environment.api}/${environment.apiVersion}/ranking/top`, {
      params: params as any,
    });
  }
}
