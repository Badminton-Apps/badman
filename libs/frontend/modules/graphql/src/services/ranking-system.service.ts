import { Inject, Injectable, PLATFORM_ID, TransferState } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { BehaviorSubject } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { isPlatformBrowser } from '@angular/common';
import { RankingSystem } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';

const WATCH_SYSTEM_KEY = 'system.id';
@Injectable({
  providedIn: 'root',
})
export class RankingSystemService {
  public watchSysem$ = new BehaviorSubject<RankingSystem | null>(null);


  constructor(
    private apollo: Apollo,
    @Inject(PLATFORM_ID) private platformId: string,
    private stateTransfer: TransferState
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
    return this.getPrimarySystemsWhere().pipe(
      transferState(`primarySystemId`, this.stateTransfer, this.platformId),
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
      map((result) => result)
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

export interface SystemCounts {
  points: {
    level: number;
    amount: number;
  }[];
  date: string;
}
