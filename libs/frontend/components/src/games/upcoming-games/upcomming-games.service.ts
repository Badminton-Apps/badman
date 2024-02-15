import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { EncounterCompetition } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import moment from 'moment';
import { connect } from 'ngxtension/connect';
import { EMPTY, Subject, merge } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  mergeMap,
  startWith,
  switchMap,
} from 'rxjs/operators';
interface RecentGamesState {
  games: EncounterCompetition[];
  loading: boolean;
  endReached?: boolean;
  hasHomeTeam: boolean;
  error: string | null;
  page: number;
}

@Injectable({
  providedIn: 'root',
})
export class UpcommingGamesService {
  private apollo = inject(Apollo);

  itemsPerPage = 10;

  filter = new FormGroup({
    teamIds: new FormControl<string[]>([]),
    clubId: new FormControl<string>(''),
  });

  // state
  private state = signal<RecentGamesState>({
    games: [],
    error: null,
    loading: true,
    page: 1,
    hasHomeTeam: false,
  });

  // selectors
  games = computed(() => this.state().games);
  error = computed(() => this.state().error);
  loading = computed(() => this.state().loading);
  endReached = computed(() => this.state().endReached);
  page = computed(() => this.state().page);
  hasHomeTeam = computed(() => this.state().hasHomeTeam);

  //sources
  pagination$ = new Subject<number | null>();
  private error$ = new Subject<string | null>();
  private filterChanged$ = this.filter.valueChanges.pipe(debounceTime(300), distinctUntilChanged());

  private gamesLoaded$ = this.filterChanged$.pipe(
    switchMap((filter) =>
      this.pagination$.pipe(
        startWith(1),
        distinctUntilChanged(),
        mergeMap(() => this._loadUpcomingEncounters(filter)),
      ),
    ),
  );

  constructor() {
    //reducers
    const nextState$ = merge(
      this.filterChanged$.pipe(
        map(() => ({
          loading: true,
          games: [],
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
      .with(this.pagination$, (state, response) => ({
        ...state,
        page: response ?? 1,
      }))
      .with(this.gamesLoaded$, (state, response) => {
        return {
          ...state,
          games: [...state.games, ...response.games],
          endReached: response.games.length < this.itemsPerPage,
          loading: false,
        };
      });
  }

  private _loadUpcomingEncounters(
    filter: Partial<{
      teamIds: string[] | null;
      teamId: string | null;
      clubId: string | null;
    }>,
  ) {
    return this.apollo
      .query<{
        encounterCompetitions: {
          rows: Partial<EncounterCompetition>[];
        };
      }>({
        query: gql`
          query UpcomingGames_page${this.page()}(
            $where: JSONObject
            $take: Int
            $skip: Int
            $order: [SortOrderType!]
          ) {
            encounterCompetitions(
              where: $where
              order: $order
              take: $take
              skip: $skip
            ) {
              rows {
                id
                date
                drawCompetition{
                  id,
                  subEventCompetition{
                    id
                    eventId
                  }
                }
                home {
                  id
                  name
                  abbreviation
                  slug
                  club {
                    id
                    slug
                  }
                }
                away {
                  id
                  name
                  abbreviation
                  slug
                  club {
                    id
                    slug
                  }
                }
              }
            }
          }
        `,
        variables: {
          where: {
            date: {
              $gte: moment().format('YYYY-MM-DD'),
            },
            $or: [
              {
                homeTeamId: filter.teamIds,
              },
              {
                awayTeamId: filter.teamIds,
              },
            ],
          },
          order: [
            {
              direction: 'asc',
              field: 'date',
            },
          ],
          skip: (this.page() - 1) * this.itemsPerPage, // Skip the previous pages
          take: this.itemsPerPage, // Load only the current page
        },
      })
      .pipe(
        catchError((err) => {
          this.handleError(err);
          return EMPTY;
        }),
        map((result) => {
          return result?.data?.encounterCompetitions?.rows?.map(
            (encounter) => new EncounterCompetition(encounter),
          );
        }),
        map((encounters) => this._setHome(filter.clubId, filter.teamId, encounters ?? [])),
        map((games) => ({
          games,
        })),
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

  private _setHome(
    clubId: string | null | undefined,
    teamId: string | null | undefined,
    encounters: EncounterCompetition[],
  ) {
    if (!clubId && !teamId) {
      return encounters;
    }

    this.state.set({
      ...this.state(),
      hasHomeTeam: true,
    });

    return encounters.map((r) => {
      if (r.home?.club?.id === clubId || r.home?.id === teamId) {
        r.showingForHomeTeam = true;
      } else {
        r.showingForHomeTeam = false;
      }
      return r;
    });
  }
}
