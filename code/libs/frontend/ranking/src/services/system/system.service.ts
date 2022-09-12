import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { BehaviorSubject } from 'rxjs';
import { map, shareReplay, switchMap } from 'rxjs/operators';

import { RankingSystem } from '@badman/frontend/models';

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

  getPrimarySystemId() {
    return this.getPrimarySystemsWhere().pipe(
      switchMap((query) =>
        this.apollo
          .query<{ rankingSystems: { id: string }[] }>({
            query: gql`
              query GetPrimarySystemsQuery($where: JSONObject) {
                rankingSystems(where: $where) {
                  id
                }
              }
            `,
            variables: {
              where: query,
            },
          })
          .pipe(
            map((x) => x.data?.rankingSystems?.[0]?.id),
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
}
