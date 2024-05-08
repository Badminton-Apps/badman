import { Injectable, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { RankingSystem } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { signalSlice } from 'ngxtension/signal-slice';
import { EMPTY, Subject, merge } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  filter,
  map,
  startWith,
  switchMap,
  throttleTime,
} from 'rxjs/operators';

export interface RankingTableState {
  ranking: RankingSystem | null;
  error: string | null;
  loaded: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class RankingTableService {
  private readonly apollo = inject(Apollo);
  private readonly error$ = new Subject<string>();

  filter = new FormGroup({
    systemId: new FormControl<string>(''),
  });

  initialState: RankingTableState = {
    ranking: null,
    loaded: false,
    error: null,
  };

  private filterChanged$ = this.filter.valueChanges.pipe(
    startWith(this.filter.value),
    filter((filter) => !!filter.systemId && filter.systemId.length > 0),
    distinctUntilChanged(),
  );

  // sources
  private rankingLoaded = this.filterChanged$.pipe(
    throttleTime(300),
    switchMap((filter) => this.getRanking(filter)),
    map((ranking) => ({ ranking, loaded: true })),
    catchError((err) => {
      this.error$.next(err);
      return EMPTY;
    }),
  );

  sources$ = merge(
    this.rankingLoaded,
    this.error$.pipe(map((error) => ({ error }))),
    this.filterChanged$.pipe(map(() => ({ loaded: false }))),
  );

  state = signalSlice({
    initialState: this.initialState,
    sources: [this.sources$],
    selectors: (state) => ({
      loadedAndError: () => {
        return state().loaded && state().error;
      },
      table: () => {
        let level = state().ranking?.amountOfLevels ?? 0;
        return (
          state().ranking?.pointsWhenWinningAgainst?.map((winning: number, index: number) => {
            return {
              level: level--,
              pointsToGoUp:
                level !== 0 ? Math.round(state().ranking?.pointsToGoUp?.[index] ?? 0) : null,
              pointsToGoDown:
                index === 0 ? null : Math.round(state().ranking?.pointsToGoDown?.[index - 1] ?? 0),
              pointsWhenWinningAgainst: Math.round(winning),
            } as RankingScoreTable;
          }) ?? []
        );
      },
    }),
  });

  private getRanking(
    filter: Partial<{
      systemId: string | null;
    }>,
  ) {
    {
      return this.apollo
        .query<{
          rankingSystem: Partial<RankingSystem>;
        }>({
          query: gql`
            query GetSystemForTable($id: ID) {
              rankingSystem(id: $id) {
                id
                name
                amountOfLevels
                pointsToGoUp
                pointsToGoDown
                pointsWhenWinningAgainst
                calculationLastUpdate
                primary
              }
            }
          `,
          variables: {
            id: filter.systemId,
          },
        })
        .pipe(
          map((result) => result.data?.rankingSystem ?? []),
          map((result) => new RankingSystem(result)),
        );
    }
  }
}

export type RankingScoreTable = {
  level: number;
  pointsToGoUp: number;
  pointsToGoDown: number;
  pointsWhenWinningAgainst: number;
};
