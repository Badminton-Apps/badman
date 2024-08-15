import { Injectable, computed, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { FetchPolicy } from '@apollo/client/core';
import { EventTournament } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { signalSlice } from 'ngxtension/signal-slice';
import { EMPTY, Observable, Subject, merge, of } from 'rxjs';
import {
  catchError,
  delay,
  distinctUntilChanged,
  filter,
  map,
  startWith,
  switchMap
} from 'rxjs/operators';

export const EVENT_QUERY = gql`
  query EventTournament($id: ID!) {
    eventTournament(id: $id) {
      id
      name
      slug
      openDate
      closeDate
      visualCode
      lastSync
      official
      subEventTournaments {
        id
        name
        eventType
        level
        rankingGroups {
          id
          name
        }
        drawTournaments {
          id
          name
          size
        }
      }
    }
  }
`;

export interface TournamentDetailState {
  tournament: EventTournament | null;
  loaded: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class TournamentDetailService {
  private readonly apollo = inject(Apollo);

  private initialState: TournamentDetailState = {
    tournament: null,
    loaded: false,
    error: null,
  };

  filter = new FormGroup({
    tournamentId: new FormControl<string>(''),
  });

  tournament = computed(() => this.state().tournament);
  loaded = computed(() => this.state().loaded);
  error = computed(() => this.state().error);

  private filterChanged$ = this.filter.valueChanges.pipe(
    startWith(this.filter.value),
    filter((filter) => !!filter.tournamentId && filter.tournamentId.length > 0),
    distinctUntilChanged(),
  );

  // sources
  private error$ = new Subject<string>();
  private tournamentLoaded = this.filterChanged$.pipe(
    // throttleTime(300),
    switchMap((filter) =>
      this.getTournament(filter.tournamentId).pipe(
        map((tournament) => ({ tournament, loaded: true, error: null })),
        startWith({ tournmaent: null, loaded: false, error: null }),
      ),
    ),
    delay(100), // some delay to show the loading indicator
    catchError((err) => {
      this.error$.next(err);
      return EMPTY;
    }),
  );

  sources$ = merge(
    this.tournamentLoaded,
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
    actionSources: {
      toggleOfficialStatus: (_state, action$: Observable<void>) =>
        action$.pipe(
          switchMap(() => this.toggleOfficialStatus(_state().tournament)),
          switchMap(() =>
            this.getTournament(_state().tournament?.id, 'no-cache').pipe(
              map((tournament) => ({ tournament, loaded: true, error: null })),
              startWith({ tournmaent: null, loaded: false, error: null }),
            ),
          ),
        ),
      setOpenCloseDates: (_state, action$: Observable<{ openDate: string; closeDate: string }>) =>
        action$.pipe(
          switchMap(({ openDate, closeDate }) =>
            this.setOpenCloseDates(_state().tournament, openDate, closeDate),
          ),
          switchMap(() =>
            this.getTournament(_state().tournament?.id, 'no-cache').pipe(
              map((tournament) => ({ tournament, loaded: true, error: null })),
              startWith({ tournmaent: null, loaded: false, error: null }),
            ),
          ),
        ),
      removeTournament: (_state, action$: Observable<void>) =>
        action$.pipe(
          switchMap(() => this.removeTournament(_state().tournament)),
          switchMap(() => of({ tournament: null, loaded: false, error: null })),
        ),
      reCalculatePoints: (_state, action$: Observable<void>) =>
        action$.pipe(
          switchMap(() => this.reCalculatePoints(_state().tournament)),
          map(() => _state()),
        ),
    },
  });

  private getTournament(
    tournamentId?: string | null,
    fetchPolicy?: FetchPolicy,
  ): Observable<EventTournament | null> {
    if (!tournamentId) {
      return of(null);
    }

    return this.apollo
      .query<{ eventTournament: Partial<EventTournament> }>({
        fetchPolicy,
        query: EVENT_QUERY,
        variables: {
          id: tournamentId,
        },
      })
      .pipe(
        map((result) => {
          if (!result?.data.eventTournament) {
            throw new Error('No tournament');
          }

          return new EventTournament(result.data.eventTournament);
        }),
      );
  }

  private toggleOfficialStatus(tournament: EventTournament | null) {
    return this.apollo.mutate({
      mutation: gql`
        mutation UpdateEventTournament($data: EventTournamentUpdateInput!) {
          updateEventTournament(data: $data) {
            id
          }
        }
      `,
      variables: {
        data: {
          id: tournament?.id,
          official: !tournament?.official,
        },
      },
    });
  }

  private removeTournament(tournament: EventTournament | null) {
    return this.apollo.mutate({
      mutation: gql`
        mutation RemoveTournament($id: ID!) {
          removeEventTournament(id: $id)
        }
      `,
      variables: {
        id: tournament?.id,
      },
    });
  }

  private reCalculatePoints(tournament: EventTournament | null) {
    return this.apollo.mutate({
      mutation: gql`
        mutation RecalculateEventTournamentRankingPoints($eventId: ID!) {
          recalculateEventTournamentRankingPoints(eventId: $eventId)
        }
      `,
      variables: {
        id: tournament?.id,
      },
    });
  }

  private setOpenCloseDates(
    tournament: EventTournament | null,
    openDate: string,
    closeDate: string,
  ) {
    return this.apollo.mutate({
      mutation: gql`
        mutation UpdateEventTournament($data: EventTournamentUpdateInput!) {
          updateEventTournament(data: $data) {
            id
          }
        }
      `,
      variables: {
        data: {
          id: tournament?.id,
          openDate,
          closeDate,
        },
      },
    });
  }
}
