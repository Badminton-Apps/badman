import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, shareReplay, switchMap } from 'rxjs/operators';
import * as addRankingSystemMutation from '../../graphql/rankingSystem/mutations/addRankingSystem.graphql';
import * as updateRankingSysyemMutatino from '../../graphql/rankingSystem/mutations/updateRankingSystem.graphql';
import * as primarySystemsQuery from '../../graphql/rankingSystem/queries/GetPrimarySystemsQuery.graphql';
import * as systemsGroupsQuery from '../../graphql/rankingSystem/queries/GetSystemGroupsQuery.graphql';
import * as systemQuery from '../../graphql/rankingSystem/queries/GetSystemQuery.graphql';
import * as systemCapsQuery from '../../graphql/rankingSystem/queries/GetSystemQueryCaps.graphql';
import * as systemWithCountsQuery from '../../graphql/rankingSystem/queries/GetSystemQueryWithCounts.graphql';
import { RankingSystem, RankingSystemGroup } from './../../models';

const WATCH_SYSTEM_KEY = 'system.id';
@Injectable({
  providedIn: 'root',
})
export class SystemService {
  public watchSysem$ = new BehaviorSubject<RankingSystem | null>(null);

  constructor(private apollo: Apollo) {
    const savedSystem = sessionStorage.getItem(WATCH_SYSTEM_KEY);
    if (savedSystem != null) {
      this.watchSysem$.next(JSON.parse(savedSystem));
    }
  }

  watchSystem(system: RankingSystem) {
    sessionStorage.setItem(WATCH_SYSTEM_KEY, JSON.stringify(system));
    this.watchSysem$.next(system);
  }

  clearWatchSystem() {
    sessionStorage.removeItem(WATCH_SYSTEM_KEY);
    this.watchSysem$.next(null);
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
    return this.apollo
      .query<{ system: RankingSystem }>({
        query: systemCapsQuery,
        variables: {
          id: systemId,
        },
      })
      .pipe(map((x) => new RankingSystem(x.data.system)));
  }

  // getSystemCaps(systemId: string) {
  //   return this.httpClient.get<{
  //     amountOfLevels: number;
  //     pointsToGoUp: number[];
  //     pointsToGoDown: number[];
  //     pointsWhenWinningAgainst: number[];
  //   }>(`${this.urlBase}/${systemId}/caps`);
  // }

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

  addSystem(rankingSystem: RankingSystem) {
    return this.apollo
      .mutate<{ updateRankingSystem: RankingSystem }>({
        mutation: addRankingSystemMutation,
        variables: {
          rankingSystem,
        },
      })
      .pipe(map((x) => new RankingSystem(x.data!.updateRankingSystem)));
  }

  updateSystem(rankingSystem: RankingSystem) {
    return this.apollo
      .mutate<{ updateRankingSystem: RankingSystem }>({
        mutation: updateRankingSysyemMutatino,
        variables: {
          rankingSystem,
        },
      })
      .pipe(map((x) => new RankingSystem(x.data!.updateRankingSystem)));
  }

  getPrimarySystem() {
    return this.getPrimarySystemsWhere().pipe(
      switchMap((query) =>
        this.apollo
          .query<{ systems: RankingSystem[] }>({
            query: primarySystemsQuery,
            variables: {
              where: query,
            },
          })
          .pipe(
            map((x) => (x.data?.systems?.length > 0 ? new RankingSystem(x.data.systems[0]) : null)),
            shareReplay(1)
          )
      )
    );
  }

  getPrimarySystemsWhere() {
    return this.watchSysem$.pipe(
      map((system) => {
        return system != null
          ? {
              id: system.id,
            }
          : {
              primary: true,
            };
      })
    );
  }

  getSystemsGroups(): Observable<RankingSystemGroup[]> {
    return this.apollo
      .query<{ rankingSystemGroup: RankingSystemGroup[] }>({
        query: systemsGroupsQuery,
      })
      .pipe(map((x) => x.data.rankingSystemGroup?.map((g) => new RankingSystemGroup(g))));
  }
}
