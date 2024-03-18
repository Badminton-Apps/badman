import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, Injector, PLATFORM_ID, TransferState, computed, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { EventCompetition } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { getCurrentSeason } from '@badman/utils';
import { Apollo, gql } from 'apollo-angular';
import { signalSlice } from 'ngxtension/signal-slice';
import { EMPTY, Observable, Subject, merge, of } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  switchMap,
  tap,
} from 'rxjs/operators';
interface EventOverviewState {
  events: EventCompetition[];
  loading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class EventOverviewService {
  private apollo = inject(Apollo);
  injector = inject(Injector);
  stateTransfer = inject(TransferState);
  platformId = inject(PLATFORM_ID);

  filter = new FormGroup({
    season: new FormControl<number>(getCurrentSeason()),
    official: new FormControl<boolean>(true),
  });

  // state
  private initialState: EventOverviewState = {
    events: [],
    error: null,
    loading: true,
  };

  // selectors
  events = computed(() => this.state().events);
  error = computed(() => this.state().error);
  loading = computed(() => this.state().loading);

  //sources
  private error$ = new Subject<string | null>();
  private filterChanged$ = this.filter.valueChanges.pipe(distinctUntilChanged());

  private eventsLoaded$ = this.filterChanged$.pipe(
    // debounce the filter changes (we don't want it on the loading, thats instant)
    debounceTime(300),
    switchMap((filter) => this._loadEvents(filter)),
  );

  sources$ = merge(
    this.eventsLoaded$.pipe(
      tap((event) => console.log('events loaded', event)),
      map((events) => ({
        events,
        loading: false,
      })),
    ),
    this.error$.pipe(map((error) => ({ error }))),
    this.filterChanged$.pipe(map(() => ({ loading: true }))),
  );

  state = signalSlice({
    initialState: this.initialState,
    sources: [this.sources$],
    actionSources: {
      updateEvent: (_state, action$: Observable<Partial<EventCompetition>>) =>
        action$.pipe(
          switchMap((event) => this._updateEvent(event)),
          // load the default system
          switchMap(() =>
            this._loadEvents(this.filter.value).pipe(map((events) => ({ events, loading: false }))),
          ),
        ),
    },
  });

  private _loadEvents(
    filter: Partial<{
      season: number | null;
      official: boolean | null;
    }>,
  ) {
    if (!filter.season) {
      return of([]);
    }

    console.log('filter', filter);

    return this.apollo
      .query<{
        eventCompetitions: {
          rows: Partial<EventCompetition>[];
          count: number;
        };
      }>({
        query: gql`
          query GetEventsCompetition_${filter.season}_${filter.official}($where: JSONObject, $order: [SortOrderType!]) {
            eventCompetitions(where: $where, order: $order) {
              count
              rows {
                id
                name
                slug
                official
                openDate
                closeDate
                visualCode
                subEventCompetitions {
                  id
                  drawCompetitions {
                    id
                  }
                }
              }
            }
          }
        `,
        variables: {
          where: {
            official: filter?.official == true ? true : undefined,
            season: filter?.season ? filter.season : undefined,
          },
          order: [
            {
              direction: 'desc',
              field: 'official',
            },
            {
              direction: 'desc',
              field: 'name',
            },
          ],
        },
      })
      .pipe(
        catchError((err) => {
          this.handleError(err);
          return EMPTY;
        }),
        transferState(
          `competitions${filter.season}_${filter?.official ?? true}`,
          this.stateTransfer,
          this.platformId,
        ),
        map((result) => {
          if (!result?.data.eventCompetitions) {
            throw new Error('No competitions found');
          }
          return result.data.eventCompetitions.rows.map((row) => new EventCompetition(row));
        }),
      );
  }

  private _updateEvent(event: Partial<EventCompetition>) {
    return this.apollo
      .mutate({
        mutation: gql`
          mutation UpdateEventCompetition($data: EventCompetitionUpdateInput!) {
            updateEventCompetition(data: $data) {
              id
            }
          }
        `,
        variables: {
          data: event,
        },
      })
      .pipe(
        catchError((err) => {
          this.handleError(err);
          return EMPTY;
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
