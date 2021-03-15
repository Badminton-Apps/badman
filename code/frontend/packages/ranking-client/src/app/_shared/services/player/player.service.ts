import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Game, Player, RankingPlace, RankingSystem } from '../../models';

const searchQuery = require('graphql-tag/loader!../../graphql/players/queries/GetPlayersQuery.graphql');
const playerQuery = require('graphql-tag/loader!../../graphql/players/queries/GetUserInfoQuery.graphql');
const playerBasicQuery = require('graphql-tag/loader!../../graphql/players/queries/GetUserBasicInfoQuery.graphql');
const gamesQuery = require('graphql-tag/loader!../../graphql/players/queries/GetUserGamesQuery.graphql');
const evolutionQuery = require('graphql-tag/loader!../../graphql/players/queries/GetPlayerEvolutionQuery.graphql');

@Injectable({
  providedIn: 'root',
})
export class PlayerService {
  constructor(private apollo: Apollo, private httpClient: HttpClient) {}

  searchPlayers(args?: { query?: string; where?: any }) {
    const parts = args.query
      .toLowerCase()
      .replace(/[;\\\\/:*?\"<>|&',]/, ' ')
      .split(' ');
    const queries = [];
    for (const part of parts) {
      queries.push({
        or: [
          { firstName: { iLike: `%${part}%` } },
          { lastName: { iLike: `%${part}%` } },
          { memberId: { iLike: `%${part}%` } },
        ],
      });
    }

    const where = {
      and: queries,
      ...args.where
    };

    return this.apollo
      .query<{players: Player[]}>({
        query: searchQuery,
        variables: {
          where,
        },
      })
      .pipe(map((x) => x.data?.players.map(r => new Player(r))));
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

    return this.httpClient.get<{
      total: number;
      rankingPlaces: RankingPlace[];
    }>(`${environment.api}/${environment.apiVersion}/ranking/top`, {
      params: params as any,
    });
  }
}
