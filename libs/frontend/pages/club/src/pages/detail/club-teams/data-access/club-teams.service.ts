import { Injectable, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Team } from '@badman/frontend-models';
import { getCurrentSeason, sortTeams } from '@badman/utils';
import { Apollo, gql } from 'apollo-angular';
import { connect } from 'ngxtension/connect';
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
  tap,
} from 'rxjs';

export interface ClubTeamsState {
  teams: Team[];
  loaded: boolean;
  error: string | null;
  page: number;
  endReached: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ClubTeamsService {
  private apollo = inject(Apollo);
  private teamsPerPage = 10;

  filter = new FormGroup({
    clubId: new FormControl<string>(''),
    season: new FormControl(getCurrentSeason()),
    choices: new FormControl<string[]>([]),
  });

  // state
  private state = signal<ClubTeamsState>({
    teams: [],
    loaded: false,
    error: null,
    page: 1,
    endReached: false,
  });

  // selectors
  teams = computed(() => this.state().teams);
  loaded = computed(() => this.state().loaded);
  error = computed(() => this.state().error);
  page = computed(() => this.state().page);

  private filterChanged$ = this.filter.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged(),
  );

  // sources
  private teamsLoaded$ = this.filterChanged$.pipe(
    tap(() => this.page$.next(1)),
    startWith(this.filter.value),
    filter((filter) => !!filter.clubId),
    switchMap((filter) => this.getTeams(filter)),
    map((teams) => teams.sort(sortTeams)),
    map((teams) => ({ teams })),
    catchError((err) => {
      this.error$.next(err);
      return EMPTY;
    }),
  );

  private error$ = new Subject<string>();
  page$ = new Subject<number>();

  constructor() {
    const nextState$ = merge(
      this.filterChanged$.pipe(
        map(() => ({
          loading: true,
          teams: [],
        })),
      ),
      this.error$.pipe(map((error) => ({ error }))),
    );

    connect(this.state)
      .with(nextState$)
      .with(this.filterChanged$, (state) => ({
        ...state,
        page: 1,
      }))
      .with(this.page$, (state, response) => ({
        ...state,
        page: response ?? 1,
      }))
      .with(this.teamsLoaded$, (state, response) => {
        return {
          ...state,
          teams: [...state.teams, ...response.teams],
          endReached: response.teams.length < this.teamsPerPage,
          loaded: true,
        };
      });
  }

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
