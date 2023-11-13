import { Injectable, computed, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Team } from '@badman/frontend-models';
import { getCurrentSeason, sortTeams } from '@badman/utils';
import { Apollo, gql } from 'apollo-angular';
import { signalSlice } from 'ngxtension/signal-slice';
import {
  EMPTY,
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  merge,
  startWith,
  switchMap,
} from 'rxjs';

export interface ClubTeamsState {
  teams: Team[];
  loaded: boolean;
  error: string | null;
  endReached: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ClubTeamsService {
  private apollo = inject(Apollo);

  filter = new FormGroup({
    clubId: new FormControl<string>(''),
    season: new FormControl(getCurrentSeason()),
    choices: new FormControl<string[]>([]),
  });

  // state
  private initialState: ClubTeamsState = {
    teams: [],
    loaded: false,
    error: null,
    endReached: false,
  };

  // selectors
  teams = computed(() => this.state().teams);
  loaded = computed(() => this.state().loaded);
  error = computed(() => this.state().error);

  private filterChanged$ = this.filter.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged(),
  );

  // sources
  private teamsLoaded$ = this.filterChanged$.pipe(
    startWith(this.filter.value),
    filter((filter) => !!filter.clubId),
    switchMap((filter) => this.getTeams(filter)),
    map((teams) => teams.sort(sortTeams)),
    map((teams) => ({ teams, loaded: true })),
    catchError((err) => {
      this.error$.next(err);
      return EMPTY;
    }),
  );

  private error$ = new Subject<string>();

  sources$ = merge(
    this.teamsLoaded$,
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
          query Teams($teamsWhere: JSONObject) {
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
}
