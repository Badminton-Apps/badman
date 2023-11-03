import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { RankingSystemService } from '@badman/frontend-graphql';
import { Game } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import moment from 'moment';
import { connect } from 'ngxtension/connect';
import { BehaviorSubject, EMPTY, Subject, merge } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  mergeMap,
  tap,
  switchMap,
} from 'rxjs/operators';
interface RecentGamesState {
  games: Game[];
  loading: boolean;
  error: string | null;
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
  });

  // selectors
  games = computed(() => this.state().games);
  error = computed(() => this.state().error);
  loading = computed(() => this.state().loading);

  //sources
  pagination$ = new BehaviorSubject<number>(1);
  private error$ = new Subject<string | null>();
  private filterChanged$ = this.filter.valueChanges.pipe(
    tap(() => this.pagination$.next(1)),
    debounceTime(300),
    distinctUntilChanged(),
  );

  private gamesLoaded$ = this.filterChanged$.pipe(
    switchMap((filter) =>
      this.pagination$.pipe(
        distinctUntilChanged(),
        mergeMap((page) => this._loadRecentGamesForPlayer(filter, page)),
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
      .with(this.gamesLoaded$, (state, response) => {
        return {
          ...state,
          games: [...state.games, ...response.games],
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
    page: number,
  ) {
    if (!filter.playerId) {
      return [];
    }

    console.log(filter.playerId, page);

    return this.systemService.getPrimarySystemId().pipe(
      switchMap((systemId) =>
        this.apollo.query<{
          player: {
            games: Partial<Game>[];
          };
        }>({
          query: gql`
            query GamesPage_${page}_${(filter.choices ?? [])?.join('_')}(
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
              systemId: systemId,
            },
            order: [
              {
                direction: 'desc',
                field: 'playedAt',
              },
            ],
            skip: (page - 1) * this.gamesPerPage, // Skip the previous pages
            take: this.gamesPerPage, // Load only the current page
          },
        }),
      ),
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
