import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { SortDirection } from '@angular/material/sort';
import { Apollo } from 'apollo-angular';
import { Observable, of } from 'rxjs';
import { filter, map, share, shareReplay, tap } from 'rxjs/operators';
import { environment } from './../../../../environments/environment';
import { RankingSystem, RankingSystemGroup } from './../../models';

import * as primarySystemsQuery from '../../graphql/rankingSystem/queries/GetPrimarySystemsQuery.graphql';
import * as systemWithCountsQuery from '../../graphql/rankingSystem/queries/GetSystemQueryWithCounts.graphql';
import * as systemQuery from '../../graphql/rankingSystem/queries/GetSystemQuery.graphql';
import * as systemsQuery from '../../graphql/rankingSystem/queries/GetSystemsQuery.graphql';
import * as systemsGroupsQuery from '../../graphql/rankingSystem/queries/GetSystemGroupsQuery.graphql';

import * as addRankingSystemMutation from '../../graphql/rankingSystem/mutations/addRankingSystem.graphql';
import * as updateRankingSysyemMutatino from '../../graphql/rankingSystem/mutations/updateRankingSystem.graphql';

@Injectable({
  providedIn: 'root',
})
export class SystemService {
  private primarySystem: RankingSystem;
  private urlBase = `${environment.api}/${environment.apiVersion}/systems`;

  constructor(private httpClient: HttpClient, private apollo: Apollo) {}

  makePrimary(systemId: string) {
    return this.httpClient.post(
      `${this.urlBase}/${systemId}/make-primary`,
      true
    );
  }

  deleteSystem(systemId: string) {
    return this.httpClient.delete(`${this.urlBase}/${systemId}`);
  }

  getSystem(systemId: string) {
    return this.apollo
      .query<{ system: RankingSystem }>({
        query: systemQuery,
        variables: {
          id: systemId,
        },
      })
      .pipe(map((x) => new RankingSystem(x.data.system)));
  }

  getSystemCaps(systemId: string) {
    return this.httpClient.get<{
      amountOfLevels: number;
      pointsToGoUp: number[];
      pointsToGoDown: number[];
      pointsWhenWinningAgainst: number[];
    }>(`${this.urlBase}/${systemId}/caps`);
  }

  getSystemWithCount(systemId: string, gender?: string) {
    return this.apollo
      .query({
        query: systemWithCountsQuery,
        variables: {
          id: systemId,
          gender,
        },
      })
      .pipe(map((x: any) => x.data?.system as RankingSystem));
  }

  // saveSystem(system: RankingSystem) {
  //   return this.httpClient.put(`${this.urlBase}/${system.id}`, system);
  // }

  // addSystem(system: RankingSystem) {
  //   return this.httpClient.post(`${this.urlBase}`, system);
  // }

  addSystem(rankingSystem: RankingSystem) {
    return this.apollo
      .mutate<{ updateRankingSystem: RankingSystem }>({
        mutation: addRankingSystemMutation,
        variables: {
          rankingSystem,
        },
      })
      .pipe(map((x) => new RankingSystem(x.data.updateRankingSystem)));
  }

  updateSystem(rankingSystem: RankingSystem) {
    return this.apollo
      .mutate<{ updateRankingSystem: RankingSystem }>({
        mutation: updateRankingSysyemMutatino,
        variables: {
          rankingSystem,
        },
      })
      .pipe(map((x) => new RankingSystem(x.data.updateRankingSystem)));
  }

  systems(sort: string, direction: SortDirection, page: number) {
    const params: any = { sort, direction, page };
    return this.httpClient.get<{ totalCount: number; items: RankingSystem[] }>(
      `${this.urlBase}`,
      { params }
    );
  }

  getPrimarySystem() {
    if (this.primarySystem != null) {
      return of(this.primarySystem);
    }

    return this.apollo
      .query<{ systems: RankingSystem[] }>({
        query: primarySystemsQuery,
      })
      .pipe(
        share(),
        map((x) =>
          x.data?.systems?.length > 0
            ? new RankingSystem(x.data.systems[0])
            : null
        ),
        tap((s) => (this.primarySystem = s))
      );
  }

  getSystems(
    sort?: string,
    direction?: SortDirection,
    page?: number
  ): Observable<RankingSystem[]> {
    return this.apollo
      .query({
        query: systemsQuery,
      })
      .pipe(map((x: any) => x.data?.systems.map((s) => new RankingSystem(s))));
  }

  getSystemsGroups(): Observable<RankingSystemGroup[]> {
    return this.apollo
      .query<{ rankingSystemGroup: RankingSystemGroup[] }>({
        query: systemsGroupsQuery,
      })
      .pipe(
        map((x) =>
          x.data.rankingSystemGroup?.map((g) => new RankingSystemGroup(g))
        )
      );
  }
}
