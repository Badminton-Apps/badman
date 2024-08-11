import { Injectable, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Game, Player, RankingSystem } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { signalSlice } from 'ngxtension/signal-slice';
import { EMPTY, Subject, merge } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  filter,
  map,
  tap,
  startWith,
  switchMap,
  throttleTime,
} from 'rxjs/operators';

export interface ListGamesState {
  games: Game[];
  error: string | null;
  loaded: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ListGamesService {
  private readonly apollo = inject(Apollo);
  private readonly error$ = new Subject<string>();

  filter = new FormGroup({
    systemId: new FormControl<string>(''),
    playerId: new FormControl<string>(''),
    includedIgnored: new FormControl<boolean>(false),
    includedUpgrade: new FormControl<boolean>(true),
    includedDowngrade: new FormControl<boolean>(true),
    includeOutOfScope: new FormControl<boolean>(false),
    gameType: new FormControl<string>(''),
    start: new FormControl(),
    end: new FormControl(),
    game: new FormControl(),
    next: new FormControl(),
  });

  initialState: ListGamesState = {
    games: [],
    loaded: false,
    error: null,
  };

  private filterChanged$ = this.filter.valueChanges.pipe(
    startWith(this.filter.value),
    tap((filter) => {
      console.log('filter', filter);
    }),
    filter(
      (filter) =>
        !!filter.systemId &&
        !!filter.gameType &&
        !!filter.start &&
        !!filter.end &&
        !!filter.playerId,
    ),
    distinctUntilChanged(),
  );

  // sources
  private rankingLoaded = this.filterChanged$.pipe(
    throttleTime(300),
    switchMap((filter) => this.getGames(filter)),
    map((ranking) => ({ ranking, loaded: true })),
    catchError((err) => {
      this.error$.next(err);
      return EMPTY;
    }),
  );

  sources$ = merge(
    this.rankingLoaded,
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

  private getGames(
    filter: Partial<{
      systemId: string | null;
      playerId: string | null;
      includedIgnored: boolean | null;
      includedUpgrade: boolean | null;
      includedDowngrade: boolean | null;
      includeOutOfScope: boolean | null;
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
