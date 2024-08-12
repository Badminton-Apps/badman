import { Injectable, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Game, Player } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { signalSlice } from 'ngxtension/signal-slice';
import { EMPTY, Observable, Subject, merge } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  filter,
  map,
  startWith,
  switchMap,
  throttleTime,
} from 'rxjs/operators';

export interface RankingBreakdownState {
  games: Game[];
  error: string | null;
  loaded: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class RankingBreakdownService {
  private readonly apollo = inject(Apollo);
  private readonly error$ = new Subject<string>();

  filter = new FormGroup({
    systemId: new FormControl<string>(''),
    playerId: new FormControl<string>(''),
    includedIgnored: new FormControl<boolean>(false),
    includedUpgrade: new FormControl<boolean>(true),
    includedDowngrade: new FormControl<boolean>(true),
    includeOutOfScopeUpgrade: new FormControl<boolean>(false),
    includeOutOfScopeDowngrade: new FormControl<boolean>(false),
    includeOutOfScopeWonGames: new FormControl<boolean>(false),
    gameType: new FormControl<string>(''),
    start: new FormControl(),
    end: new FormControl(),
    game: new FormControl(),
    next: new FormControl(),
  });

  initialState: RankingBreakdownState = {
    games: [],
    loaded: false,
    error: null,
  };

  private filterChanged$ = this.filter.valueChanges.pipe(
    startWith(this.filter.value),
    filter(
      (filter) =>
        !!filter.systemId &&
        !!filter.gameType &&
        !!filter.start &&
        !!filter.end &&
        !!filter.playerId,
    ),
    distinctUntilChanged(
      (a, b) =>
        a.systemId === b.systemId &&
        a.gameType === b.gameType &&
        a.start === b.start &&
        a.end === b.end &&
        a.playerId === b.playerId,
    ),
  );

  // sources
  private dataLoaded = this.filterChanged$.pipe(
    throttleTime(300),
    switchMap((filter) => this.getGames(filter)),
    map((games) => ({ games, loaded: true })),
    catchError((err) => {
      this.error$.next(err);
      return EMPTY;
    }),
  );

  sources$ = merge(
    this.dataLoaded,
    this.error$.pipe(map((error) => ({ error }))),
    this.filterChanged$.pipe(map(() => ({ loaded: false, games: [] }))),
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
      reset: (_state, action$: Observable<void>) =>
        action$.pipe(
          map(() => {
            return this.initialState;
          }),
        ),
    },
  });

  private getGames(
    filter: Partial<{
      systemId: string | null;
      playerId: string | null;
      gameType: string | null;
      start: string | null;
      end: string | null;
    }>,
  ) {
    return this.apollo
      .query<{ player: Player }>({
        fetchPolicy: 'no-cache',
        query: gql`
          query PlayerGames($where: JSONObject, $playerId: ID!, $systemId: ID!) {
            player(id: $playerId) {
              id
              games(where: $where) {
                id
                playedAt
                winner
                status
                gameType
                players {
                  id
                  team
                  player
                  fullName
                  single
                  double
                  mix
                }
                rankingPoints(where: { systemId: $systemId }) {
                  id
                  differenceInLevel
                  playerId
                  points
                }
              }
            }
          }
        `,
        variables: {
          where: {
            gameType: filter.gameType == 'single' ? 'S' : filter.gameType == 'double' ? 'D' : 'MX',
            playedAt: {
              $between: [filter.start, filter.end],
            },
            set1Team1: { $ne: null },
            set1Team2: { $ne: null },
          },
          playerId: filter.playerId,
          systemId: filter.systemId,
        },
      })
      .pipe(map((x) => x.data.player.games?.map((g) => new Game(g)) ?? []));
  }
}

export type RankingScoreTable = {
  level: number;
  pointsToGoUp: number;
  pointsToGoDown: number;
  pointsWhenWinningAgainst: number;
};
