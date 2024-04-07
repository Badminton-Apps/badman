import {
  Injectable,
  PLATFORM_ID,
  TransferState,
  computed,
  inject,
} from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { transferState } from '@badman/frontend-utils';
import { RankingSystem } from '@badman/models';
import { Apollo, gql } from 'apollo-angular';
import { signalSlice } from 'ngxtension/signal-slice';
import {
  EMPTY,
  Subject,
  catchError,
  tap,
  distinctUntilChanged,
  map,
  merge,
  startWith,
  switchMap,
  throttleTime,
} from 'rxjs';

export interface State {
  system: RankingSystem | null;
  loaded: boolean;
  error: string | null;
}

type Filter = {
  // Required
  systemId: string;
} & Partial<{
  // Optional
}>;

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private readonly apollo = inject(Apollo);
  private readonly transferState = inject(TransferState);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly STATE_KEY = RankingSystem.name.toLowerCase();

  private initialState: State = {
    system: null,
    loaded: false,
    error: null,
  };

  filter = new FormGroup({
    systemId: new FormControl<string | null>(null),
  });

  system = computed(() => this.state().system);
  loaded = computed(() => this.state().loaded);
  error = computed(() => this.state().error);

  private filterChanged$ = this.filter.valueChanges.pipe(
    startWith(this.filter.value),
    distinctUntilChanged(),
  );

  // sources
  private error$ = new Subject<string>();
  private dataLoaded$ = this.filterChanged$.pipe(
    throttleTime(600),
    switchMap((change) => this.getData(change as Filter)),
    map((system) => ({ system, loaded: true }) as State),
    catchError((err) => {
      this.error$.next(err);
      return EMPTY;
    }),
  );

  sources$ = merge(
    this.dataLoaded$,
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
    }),
  });

  private getData(filter: Filter) {
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
        catchError((err) => {
          console.error(err);
          return EMPTY;
        }),
        tap((result) => console.log(result)),

        map((result) => result.data.rankingSystem),
        transferState(
          `${this.STATE_KEY}_${JSON.stringify(filter)}`,
          this.transferState,
          this.platformId,
        ),
      );
  }
}
