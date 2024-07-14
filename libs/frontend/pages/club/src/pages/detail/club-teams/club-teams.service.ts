import { Injectable, computed, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Location, Team } from '@badman/frontend-models';
import { getSeason, sortTeams } from '@badman/utils';
import { Apollo, gql } from 'apollo-angular';
import { signalSlice } from 'ngxtension/signal-slice';
import { EMPTY, Subject, asyncScheduler, merge, of } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  startWith,
  switchMap,
  throttleTime,
} from 'rxjs/operators';

export interface ClubTeamsState {
  teams: Team[];
  locations: Location[];
  teamsLoaded: boolean;
  locationsLoaded: boolean;
  error: string | null;
  endReached: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ClubTeamsService {
  private apollo = inject(Apollo);
  private error$ = new Subject<string>();

  filter = new FormGroup({
    clubId: new FormControl<string>(''),
    season: new FormControl(getSeason()),
    choices: new FormControl<string[]>(['M', 'F', 'MX', 'NATIONAL']),
  });

  // state
  private initialState: ClubTeamsState = {
    teams: [],
    locations: [],
    teamsLoaded: false,
    locationsLoaded: false,
    error: null,
    endReached: false,
  };

  // selectors
  teams = computed(() => this.state().teams);
  locations = computed(() => this.state().locations);
  loaded = computed(() => this.state().teamsLoaded && this.state().locationsLoaded);
  error = computed(() => this.state().error);

  // sources
  private filterChanged$ = this.filter.valueChanges.pipe(
    startWith(this.filter.value),
    filter((filter) => !!filter.clubId && filter.clubId.length > 0),
    distinctUntilChanged(),
  );

  private teamsLoaded$ = this.filterChanged$.pipe(
    throttleTime(300, asyncScheduler, { leading: true, trailing: true }),
    switchMap((filter) =>
      this.getTeams(filter).pipe(
        map((teams) => teams.sort(sortTeams)),
        map((teams) => ({ teams, teamsLoaded: true })),
        startWith({
          teams: [] as Team[],
          teamsLoaded: false,
          error: null,
        }),
      ),
    ),
    shareReplay(1),
    catchError((err) => {
      this.error$.next(err);
      return EMPTY;
    }),
  );

  private locationsLoaded$ = this.filterChanged$.pipe(
    throttleTime(300, asyncScheduler, { leading: true, trailing: true }),
    switchMap((filter) =>
      this.getLocations(filter).pipe(
        map((locations) => ({ locations, locationsLoaded: true })),
        startWith({
          locations: [] as Location[],
          locationsLoaded: false,
        }),
      ),
    ),
    shareReplay(1),
    catchError((err) => {
      this.error$.next(err);
      return EMPTY;
    }),
  );

  sources$ = merge(
    this.teamsLoaded$,
    this.locationsLoaded$,
    this.error$.pipe(map((error) => ({ error }))),
  );

  state = signalSlice({
    initialState: this.initialState,
    sources: [this.sources$],
    selectors: (state) => ({
      loadedAndError: () => {
        return state().teamsLoaded && state().error;
      },
    }),
  });

  private getTeams(
    filter: Partial<{
      clubId: string | null;
      season: number | null;
      choices: string[] | null;
    }>,
  ) {
    return this.apollo
      .watchQuery<{ teams: Partial<Team>[] }>({
        query: gql`
          query ClubTeams($teamsWhere: JSONObject) {
            teams(where: $teamsWhere) {
              id
              name
              slug
              teamNumber
              season
              captainId
              type
              clubId
              email
              phone
              preferredDay
              preferredTime
              prefferedLocationId
              entry {
                id
                date
                subEventCompetition {
                  id
                  name
                }
                standing {
                  id
                  position
                  size
                }
              }
            }
          }
        `,
        variables: {
          teamsWhere: {
            clubId: filter.clubId,
            season: filter?.season,
            type: filter?.choices,
          },
        },
      })
      .valueChanges.pipe(
        map((result) => result.data?.teams ?? []),
        map((result) => result?.map((t) => new Team(t))),
      );
  }

  private getLocations(
    filter: Partial<{
      clubId: string | null;
      season: number | null;
    }>,
  ) {
    const { clubId, season } = filter;

    if (!clubId || !season) {
      console.error('No clubId or season provided');
      return of([]);
    }

    return this.apollo
      .query<{ locations: Location[] }>({
        fetchPolicy: 'network-only',
        query: gql`
          query Locations($where: JSONObject, $availabilitiesWhere: JSONObject) {
            locations(where: $where) {
              id
              name
              address
              street
              streetNumber
              postalcode
              city
              state
              phone
              fax
              availabilities(where: $availabilitiesWhere) {
                id
                season
                days {
                  day
                  startTime
                  endTime
                  courts
                }
                exceptions {
                  start
                  end
                  courts
                }
              }
            }
          }
        `,
        variables: {
          where: {
            clubId,
          },
          availabilitiesWhere: {
            season,
          },
        },
      })
      .pipe(map((result) => result.data?.locations?.map((location) => new Location(location))));
  }
}
