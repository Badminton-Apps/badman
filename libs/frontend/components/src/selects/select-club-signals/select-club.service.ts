import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, Injector, PLATFORM_ID, TransferState, computed, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Club } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { signalSlice } from 'ngxtension/signal-slice';
import { EMPTY, Subject, merge } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  map,
  startWith,
  switchMap,
  throttleTime,
} from 'rxjs/operators';
interface SelectClubsState {
  clubs: Club[];
  loading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class SelectClubsService {
  private apollo = inject(Apollo);
  injector = inject(Injector);
  stateTransfer = inject(TransferState);
  platformId = inject(PLATFORM_ID);

  filter = new FormGroup({
    country: new FormControl<string>('be'),
  });

  // state
  private initialState: SelectClubsState = {
    clubs: [],
    error: null,
    loading: true,
  };

  // selectors
  clubs = computed(() => this.state().clubs);
  error = computed(() => this.state().error);
  loading = computed(() => this.state().loading);

  //sources
  private error$ = new Subject<string | null>();
  private filterChanged$ = this.filter.valueChanges.pipe(
    startWith(this.filter.value),
    distinctUntilChanged(),
  );

  private clubsLoaded$ = this.filterChanged$.pipe(
    throttleTime(300),
    switchMap((filter) => this._loadClubs(filter)),
    catchError((err) => {
      this.error$.next(err);
      return EMPTY;
    }),
  );

  sources$ = merge(
    this.clubsLoaded$.pipe(
      map((clubs) => ({
        clubs,
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

  private _loadClubs(
    filter: Partial<{
      country: string | null;
    }>,
  ) {
    return this.apollo
      .query<{
        clubs: {
          rows: Partial<Club>[];
          count: number;
        };
      }>({
        query: gql`
          query GetClubs($where: JSONObject) {
            clubs(where: $where) {
              count
              rows {
                id
                name
                slug
                clubId
              }
            }
          }
        `,
        variables: {
          where: {
            country: filter.country,
          },
        },
      })
      .pipe(
        catchError((err) => {
          this.handleError(err);
          return EMPTY;
        }),
        map((result) => {
          if (!result?.data.clubs) {
            throw new Error('No competitions found');
          }
          return result.data.clubs.rows.map((row) => new Club(row));
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
}
