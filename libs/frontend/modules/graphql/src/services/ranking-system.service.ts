import { Injectable, computed, inject } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, merge, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

import { RankingSystem } from '@badman/frontend-models';
import { signalSlice } from 'ngxtension/signal-slice';

export interface RankingState {
  rankingSystem: RankingSystem | null;
  loaded: boolean;
}

const SYSTEM_QUERY = gql`
  query GetRankingSystem($id: ID) {
    rankingSystem(id: $id) {
      id
      name
      differenceForDowngradeSingle
      differenceForDowngradeDouble
      differenceForDowngradeMix
      differenceForUpgradeSingle
      differenceForUpgradeDouble
      differenceForUpgradeMix
      updateIntervalAmountLastUpdate
      calculationIntervalLastUpdate
      calculationIntervalUnit
      calculationIntervalAmount
      calculationDayOfWeek
      minNumberOfGamesUsedForUpgrade
      minNumberOfGamesUsedForDowngrade
      updateIntervalAmount
      updateIntervalUnit
      updateDayOfWeek
      periodAmount
      periodUnit
      pointsToGoUp
      pointsWhenWinningAgainst
      pointsToGoDown
      amountOfLevels
      latestXGamesToUse
      primary
    }
  }
`;

const WATCH_SYSTEM_ID_KEY = 'watch.system.id';
@Injectable({
  providedIn: 'root',
})
export class RankingSystemService {
  private apollo = inject(Apollo);

  // state
  initialState: RankingState = {
    rankingSystem: null,
    loaded: false,
  };

  // selectors
  system = computed(() => this.state().rankingSystem);
  systemId = computed(() => this.state().rankingSystem?.id);
  primary = computed(() => this.state().rankingSystem?.primary);

  // sources
  private servicesLoaded$ = of(
    sessionStorage.getItem(WATCH_SYSTEM_ID_KEY),
  ).pipe(switchMap((saved) => this._loadSystem(saved)));

  //sources
  sources$ = merge(
    this.servicesLoaded$.pipe(
      map((rankingSystem) => ({
        rankingSystem,
        loaded: true,
      })),
    ),
  );

  state = signalSlice({
    initialState: this.initialState,
    sources: [this.sources$],
    actionSources: {
      watchSystem: (_state, action$: Observable<string>) =>
        action$.pipe(
          tap((id) => sessionStorage.setItem(WATCH_SYSTEM_ID_KEY, id)),
          switchMap((id) =>
            this._loadSystem(id).pipe(
              map((system) => ({ rankingSystem: system, loaded: true })),
            ),
          ),
        ),
      clearWatchSystem: (_state, action$: Observable<void>) =>
        action$.pipe(
          tap(() => sessionStorage.removeItem(WATCH_SYSTEM_ID_KEY)),
          switchMap(() =>
            this._loadSystem().pipe(
              map((system) => ({ rankingSystem: system, loaded: true })),
            ),
          ),
        ),
    },
  });

  private _loadSystem(id?: string | null) {
    return this.apollo
      .query<{
        rankingSystem: RankingSystem;
      }>({
        query: SYSTEM_QUERY,
        variables: {
          id,
        },
      })
      .pipe(map((res) => new RankingSystem(res.data?.rankingSystem)));
  }
}
