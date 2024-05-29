import { Injectable, computed, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Team } from '@badman/frontend-models';
import { getCurrentSeason, sortTeams } from '@badman/utils';
import { Apollo, gql } from 'apollo-angular';
import { signalSlice } from 'ngxtension/signal-slice';
import { EMPTY, Subject, asyncScheduler, merge } from 'rxjs';
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
  loaded: boolean;
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
    season: new FormControl(getCurrentSeason()),
    choices: new FormControl<string[]>(['M', 'F', 'MX', 'NATIONAL']),
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
        map((teams) => ({ teams, loaded: true })),
        startWith({
          teams: [] as Team[],
          loaded: false,
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

  sources$ = merge(this.teamsLoaded$, this.error$.pipe(map((error) => ({ error }))));

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
