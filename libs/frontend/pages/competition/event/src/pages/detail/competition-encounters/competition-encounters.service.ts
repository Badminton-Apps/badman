import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { EncounterCompetition, EventCompetition } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import moment from 'moment';
import { signalSlice } from 'ngxtension/signal-slice';
import { EMPTY, Observable, Subject, merge } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  startWith,
  switchMap,
} from 'rxjs/operators';

export interface CompetitionEncounterState {
  encounters: EncounterCompetition[];
  error: string | null;
  loaded: boolean;

  filterClub: string | null;
  filterTeam: string | null;
  filterChangedRequest: boolean;
  filterOpenRequests: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class CompetitionEncounterService {
  apollo = inject(Apollo);

  filter = new FormGroup({
    eventId: new FormControl(),
  });

  initialState: CompetitionEncounterState = {
    encounters: [],
    error: null,
    loaded: false,

    filterClub: null,
    filterTeam: null,
    filterChangedRequest: false,
    filterOpenRequests: false,
  };

  // selectors
  encounters = computed(() => {
    let filtered = this.state().encounters;

    if (this.state().filterClub) {
      filtered = filtered.filter(
        (encounter) =>
          encounter.home?.club?.id === this.state().filterClub ||
          encounter.away?.club?.id === this.state().filterClub,
      );
    }

    if (this.state().filterTeam) {
      filtered = filtered.filter(
        (encounter) =>
          encounter.home?.id === this.state().filterTeam ||
          encounter.away?.id === this.state().filterTeam,
      );
    }

    if (this.state().filterChangedRequest) {
      filtered = filtered.filter(
        (encounter) => !moment(encounter.originalDate).isSame(encounter.date),
      );
    }

    if (this.state().filterOpenRequests) {
      filtered = filtered.filter((encounter) => !(encounter.encounterChange?.accepted ?? true));
    }

    return filtered;
  });

  clubs = computed(() =>
    this.state()
      .encounters.map((encounter) => encounter.home?.club)
      .concat(this.state().encounters.map((encounter) => encounter.away?.club))
      .filter((club) => club !== undefined)
      .filter((club, index, self) => self.findIndex((c) => c?.id === club?.id) === index),
  );

  teams = computed(() =>
    this.state()
      .encounters.map((encounter) => encounter.home)
      .concat(this.state().encounters.map((encounter) => encounter.away))
      .filter((team) => team !== undefined)
      .filter((club, index, self) => self.findIndex((c) => c?.id === club?.id) === index),
  );

  //sources
  private error$ = new Subject<string | null>();
  private filterChanged$ = this.filter.valueChanges.pipe(
    startWith(this.filter.value),
    filter(() => this.filter.value.eventId !== null),
    distinctUntilChanged(),
  );

  private encountersLoaded$ = this.filterChanged$.pipe(
    debounceTime(300), // Queries are better when debounced
    switchMap((filter) => this._loadEncounters(filter)),
    catchError((err) => {
      this.error$.next(err);
      return EMPTY;
    }),
  );

  sources$ = merge(
    this.encountersLoaded$.pipe(
      map((encounters) => ({
        encounters,
        filtered: encounters,
        loaded: true,
      })),
    ),
    this.error$.pipe(map((error) => ({ error }))),
    this.filterChanged$.pipe(map(() => ({ encounters: [], loaded: false }))),
  );

  state = signalSlice({
    initialState: this.initialState,
    sources: [this.sources$],
    actionSources: {
      filterOnClub: (_state, action$: Observable<string>) =>
        action$.pipe(
          map((filterClub) => ({
            filterClub,
          })),
        ),
      filterOnTeam: (_state, action$: Observable<string>) =>
        action$.pipe(
          map((filterTeam) => ({
            filterTeam,
          })),
        ),
      filterOnChangedRequest: (_state, action$: Observable<boolean>) =>
        action$.pipe(
          map((filterChangedRequest) => ({
            filterChangedRequest,
          })),
        ),
      filterOnOpenRequests: (_state, action$: Observable<boolean>) =>
        action$.pipe(
          map((filterOpenRequests) => ({
            filterOpenRequests,
          })),
        ),
    },
  });

  private _loadEncounters(
    filter: Partial<{
      eventId: string | null;
      clubId: string | null;
      teamId: string | null;
    }>,
  ) {
    return this.apollo
      .query<{ eventCompetition: EventCompetition }>({
        query: gql`
          query GetEventEncounters($id: ID!, $where: JSONObject) {
            eventCompetition(id: $id) {
              id
              subEventCompetitions {
                id
                drawCompetitions {
                  id
                  encounterCompetitions(where: $where) {
                    id
                    date
                    originalDate
                    home {
                      id
                      name
                      club {
                        id
                        name
                      }
                    }
                    away {
                      id
                      name
                      club {
                        id
                        name
                      }
                    }
                    homeScore
                    awayScore
                    encounterChange {
                      id
                      accepted
                    }
                    location {
                      id
                      name
                    }
                  }
                }
              }
            }
          }
        `,
        variables: {
          id: filter.eventId,
        },
      })
      .pipe(
        catchError((err) => {
          this.handleError(err);
          return EMPTY;
        }),
        map((result) => {
          if (!result?.data.eventCompetition) {
            throw new Error('No event found');
          }
          return result.data.eventCompetition;
        }),
        map((event) =>
          (event.subEventCompetitions ?? []).flatMap((subEvent) =>
            (subEvent.drawCompetitions ?? []).flatMap((draw) => draw.encounterCompetitions),
          ),
        ),
        map((encounters) => encounters?.map((encounter) => new EncounterCompetition(encounter))),
      );
  }

  private handleError(err: HttpErrorResponse) {
    // Handle specific error cases
    if (err.status === 404 && err.url) {
      this.error$.next(`Failed to load clubs`);
      return;
    }

    // Generic error if no cases match
    this.error$.next(err.statusText);
  }
}
