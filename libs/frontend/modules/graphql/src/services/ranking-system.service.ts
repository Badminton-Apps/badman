import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { BehaviorSubject, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { makeStateKey, TransferState } from '@angular/platform-browser';
import { RankingSystem } from '@badman/frontend-models';

const WATCH_SYSTEM_KEY = 'system.id';
@Injectable({
  providedIn: 'root',
})
export class RankingSystemService {
  public watchSysem$ = new BehaviorSubject<RankingSystem | null>(null);

  constructor(
    private apollo: Apollo,
    private transferState: TransferState,
    @Inject(PLATFORM_ID) private platformId: string
  ) {
    if (isPlatformBrowser(this.platformId)) {
      const savedSystem = sessionStorage.getItem(WATCH_SYSTEM_KEY);
      if (savedSystem != null) {
        this.watchSysem$.next(JSON.parse(savedSystem));
      }
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
    const STATE_KEY = makeStateKey<string>('primarySystemId');

    if (this.transferState.hasKey(STATE_KEY)) {
      const state = this.transferState.get(STATE_KEY, null);

      if (state) {
        return of(state);
      }

      return of();
    } else {
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
            .pipe(map((x) => x.data?.rankingSystems?.[0]?.id))
        ),
        map((result) => result),
        tap((result) => {
          if (isPlatformServer(this.platformId)) {
            this.transferState.set(STATE_KEY, result);
          }
        })
      );
    }
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

export interface SystemCounts {
  points: {
    level: number;
    amount: number;
  }[];
  date: string;
}
