import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { EncounterCompetition } from '@badman/frontend-models';
import { getSeasonPeriod, sortTeams } from '@badman/utils';
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

export interface ClubEncounterState {
  encounters: EncounterCompetition[];
  error: string | null;
  loaded: boolean;

  filterHomeGames: boolean;
  filterOpenRequests: boolean;
  filterChangedRequest: boolean;
  filterTeam: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ClubEncounterService {
  apollo = inject(Apollo);

  filter = new FormGroup({
    clubId: new FormControl(),
    season: new FormControl(),
  });

  initialState: ClubEncounterState = {
    encounters: [],
    error: null,
    loaded: false,

    filterHomeGames: false,
    filterOpenRequests: false,
    filterChangedRequest: false,
    filterTeam: null,
  };

  // selectors
  encounters = computed(() => {
    let filtered = this.state().encounters;

    if (this.state().filterHomeGames) {
      filtered = filtered.filter(
        (encounter) => encounter.home?.clubId === this.filter.value.clubId,
      );
    }

    if (this.state().filterOpenRequests) {
      filtered = filtered.filter((encounter) => !(encounter.encounterChange?.accepted ?? true));
    }

    if (this.state().filterChangedRequest) {
      filtered = filtered.filter(
        (encounter) => !moment(encounter.originalDate).isSame(encounter.date),
      );
    }

    if (this.state().filterTeam) {
      filtered = filtered.filter(
        (encounter) =>
          encounter.home?.id === this.state().filterTeam ||
          encounter.away?.id === this.state().filterTeam,
      );
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
      .filter((team) => team.clubId === this.filter.value.clubId)
      .filter((club, index, self) => self.findIndex((c) => c?.id === club?.id) === index)
      .sort(sortTeams),
  );

  //sources
  private error$ = new Subject<string | null>();
  private filterChanged$ = this.filter.valueChanges.pipe(
    startWith(this.filter.value),
    filter((filter) => !!filter.clubId),
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
      filterOnHomeGames: (_state, action$: Observable<boolean>) =>
        action$.pipe(
          map((filterHomeGames) => ({
            filterHomeGames,
          })),
        ),
    },
  });

  private _loadEncounters(
    filter: Partial<{
      clubId: string | null;
      season: number;
    }>,
  ) {
    const period = getSeasonPeriod(filter.season);

    return this.apollo
      .query<{
        encounterCompetitions: { count: number; rows: EncounterCompetition[] };
      }>({
        query: gql`
          query GetClubEncounters($where: JSONObject) {
            encounterCompetitions(where: $where) {
              count
              rows {
                id
                date
                home {
                  id
                  name
                  clubId
                  type
                  teamNumber
                }
                away {
                  id
                  name
                  clubId
                  type
                  teamNumber
                }
                homeScore
                awayScore
                drawCompetition {
                  id
                  subEventCompetition {
                    id
                    eventType
                    eventId
                  }
                }
                encounterChange {
                  id
                  accepted
                }
              }
            }
          }
        `,
        variables: {
          where: {
            date: {
              $gte: moment(period[0]).toISOString(),
              $lt: moment(period[1]).toISOString(),
            },
            $or: [
              {
                '$home.clubId$': filter.clubId,
              },

              {
                '$away.clubId$': filter.clubId,
              },
            ],
          },
        },
      })
      .pipe(
        catchError((err) => {
          this.handleError(err);
          return EMPTY;
        }),
        map((result) => result.data?.encounterCompetitions.rows),
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
