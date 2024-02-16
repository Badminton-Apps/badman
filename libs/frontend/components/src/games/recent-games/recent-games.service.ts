import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { RankingSystemService } from '@badman/frontend-graphql';
import { Game } from '@badman/frontend-models';
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
  games: Game[];
  loading: boolean;
  endReached?: boolean;
  error: string | null;
  page: number;
}

@Injectable({
  providedIn: 'root',
})
export class RecentGamesService {
  private apollo = inject(Apollo);
  private systemService = inject(RankingSystemService);

  private gamesPerPage = 10;

  filter = new FormGroup({
    playerId: new FormControl<string>(''),
    choices: new FormControl<string[]>([]),
  });

  // state
  private state = signal<RecentGamesState>({
    games: [],
    error: null,
    loading: true,
    page: 1,
  });

  // selectors
  games = computed(() => this.state().games);
  error = computed(() => this.state().error);
  loading = computed(() => this.state().loading);
  endReached = computed(() => this.state().endReached);
  page = computed(() => this.state().page);

  //sources
  pagination$ = new Subject<number | null>();
  private error$ = new Subject<string | null>();
  private filterChanged$ = this.filter.valueChanges.pipe(debounceTime(300), distinctUntilChanged());

  private gamesLoaded$ = this.filterChanged$.pipe(
    switchMap((filter) =>
      this.pagination$.pipe(
        startWith(1),
        distinctUntilChanged(),
        mergeMap(() => this._loadRecentGamesForPlayer(filter)),
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
          endReached: response.games.length < this.gamesPerPage,
          loading: false,
        };
      });
  }

  private _loadRecentGamesForPlayer(
    filter: Partial<{
      playerId: string | null;
      systemId: string | null;
      choices: string[] | null;
    }>,
  ) {
    if (!filter.playerId) {
      return [];
    }

    return this.apollo
      .query<{
        player: {
          games: Partial<Game>[];
        };
      }>({
        query: gql`
        query GamesPage_${this.page()}_${(filter.choices ?? [])?.join('_')}(
          $id: ID!
          $where: JSONObject
          $whereRanking: JSONObject
          $take: Int
          $skip: Int
          $order: [SortOrderType!]
        ) {
          player(id: $id) {
            id
            games(where: $where, order: $order, take: $take, skip: $skip) {
              id
              playedAt
              gameType
              winner
              players {
                id
                slug
                fullName
                team
                player
                single
                double
                mix
              }
              rankingPoints(where: $whereRanking) {
                id
                differenceInLevel
                points
                playerId
                system {
                  id
                  differenceForDowngradeSingle
                  differenceForDowngradeDouble
                  differenceForDowngradeMix
                  differenceForUpgradeSingle
                  differenceForUpgradeDouble
                  differenceForUpgradeMix
                }
              }
              set1Team1
              set1Team2
              set2Team1
              set2Team2
              set3Team1
              set3Team2
              order
              competition {
                id
                drawCompetition {
                  name
                  id
                  subEventCompetition {
                    id
                    name
                    eventId
                  }
                }

                home {
                  id
                  name
                }

                away {
                  id
                  name
                }
              }
              tournament {
                name
                subEventTournament {
                  name
                  id
                  eventTournament {
                    id
                    name
                  }
                }
                id
              }
            }
          }
        }
      `,
        variables: {
          id: filter.playerId,
          where: {
            playedAt: {
              $lte: moment().format('YYYY-MM-DD'),
            },
            gameType: {
              $in: filter?.choices ?? ['S', 'D', 'MX'],
            },
          },
          whereRanking: {
            systemId: this.systemService.systemId(),
          },
          order: [
            {
              direction: 'desc',
              field: 'playedAt',
            },
            {
              direction: 'desc',
              field: 'id',
            },
          ],
          skip: (this.page() - 1) * this.gamesPerPage, // Skip the previous pages
          take: this.gamesPerPage, // Load only the current page
        },
      })
      .pipe(
        catchError((err) => {
          this.handleError(err);
          return EMPTY;
        }),
        map((result) => {
          return result?.data.player?.games?.map((game) => new Game(game)) ?? [];
        }),
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
}
