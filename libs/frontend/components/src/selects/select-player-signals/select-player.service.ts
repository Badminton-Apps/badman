import { HttpErrorResponse } from '@angular/common/http';
import { Injector, PLATFORM_ID, TransferState, computed, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Player } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { signalSlice } from 'ngxtension/signal-slice';
import { EMPTY, Subject, merge } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  startWith,
  switchMap,
} from 'rxjs/operators';
interface SelectPlayersState {
  players: Player[];
  loading: boolean;
  error: string | null;
}

export class SelectPlayersService {
  private apollo = inject(Apollo);
  injector = inject(Injector);
  stateTransfer = inject(TransferState);
  platformId = inject(PLATFORM_ID);

  filter = new FormGroup({
    emptyWhere: new FormControl<{
      [key: string]: unknown;
    }>({}),
    query: new FormControl<string>(''),
    where: new FormControl<{
      [key: string]: unknown;
    }>({}),
  });

  // state
  private initialState: SelectPlayersState = {
    players: [],
    error: null,
    loading: true,
  };

  // selectors
  players = computed(() => this.state().players);
  error = computed(() => this.state().error);
  loading = computed(() => this.state().loading);

  //sources
  private error$ = new Subject<string | null>();
  private filterChanged$ = this.filter.valueChanges.pipe(
    startWith(this.filter.value),
    filter(
      (filter) =>
        (filter.query?.length ?? 0) > 2 ||
        Object.keys(filter.where ?? {}).length > 0 ||
        Object.keys(filter.emptyWhere ?? {}).length > 0,
    ),
    distinctUntilChanged(),
  );

  private playersLoaded$ = this.filterChanged$.pipe(
    debounceTime(300), // Queries are better when debounced
    switchMap((filter) => this._loadPlayers(filter)),
    catchError((err) => {
      this.error$.next(err);
      return EMPTY;
    }),
  );

  sources$ = merge(
    this.playersLoaded$.pipe(
      map((players) => ({
        players,
        loading: false,
      })),
    ),
    this.error$.pipe(map((error) => ({ error }))),
    this.filterChanged$.pipe(map(() => ({ loading: true }))),
  );

  state = signalSlice({
    initialState: this.initialState,
    sources: [this.sources$],
  });

  private _loadPlayers(
    filter: Partial<{
      query: string | null;
      where: { [key: string]: unknown } | null;
      emtpyWhere: { [key: string]: unknown };
    }>,
  ) {
    return this.apollo
      .query<{
        players: {
          rows: Partial<Player>[];
          count: number;
        };
      }>({
        query: gql`
          query GetPlayers($where: JSONObject) {
            players(where: $where) {
              count
              rows {
                id
                slug
                memberId
                fullName
                gender
                competitionPlayer
                clubs {
                  id
                  name
                  clubMembership {
                    id
                    active
                    confirmed
                  }
                }
              }
            }
          }
        `,
        variables: {
          where: this._playerSearchWhere(filter),
        },
      })
      .pipe(
        catchError((err) => {
          this.handleError(err);
          return EMPTY;
        }),
        map((result) => {
          if (!result?.data.players) {
            throw new Error('No competitions found');
          }
          return result.data.players.rows.map((row) => new Player(row));
        }),
      );
  }

  private handleError(err: HttpErrorResponse) {
    // Handle specific error cases
    if (err.status === 404 && err.url) {
      this.error$.next(`Failed to load games`);
      return;
    }

    // Generic error if no cases match
    this.error$.next(err.statusText);
  }

  private _playerSearchWhere(
    args: Partial<{
      query: string | null;
      where: { [key: string]: unknown } | null;
      emptyWhere: { [key: string]: unknown };
    }>,
  ) {
    if (!args?.query) {
      return args?.emptyWhere ?? {};
    }

    const parts = args?.query
      ?.toLowerCase()
      .replace(/[;\\\\/:*?"<>|&',]/, ' ')
      .split(' ');
    const queries: unknown[] = [];
    if (!parts) {
      return;
    }
    for (const part of parts) {
      queries.push({
        $or: [
          { firstName: { $iLike: `%${part}%` } },
          { lastName: { $iLike: `%${part}%` } },
          { memberId: { $iLike: `%${part}%` } },
        ],
      });
    }

    return {
      $and: queries,
      ...args?.where,
    };
  }
}
