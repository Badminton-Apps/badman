import { Injectable, computed, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { FetchPolicy } from '@apollo/client/core';
import { RankingSystemService } from '@badman/frontend-graphql';
import { Player, Team } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { signalSlice } from 'ngxtension/signal-slice';
import { EMPTY, Observable, Subject, combineLatest, merge, of } from 'rxjs';
import {
  catchError,
  delay,
  distinctUntilChanged,
  filter,
  map,
  startWith,
  switchMap,
} from 'rxjs/operators';

export const PLAYER_QUERY = gql`
  query GetPlayerInfo($id: ID!, $systemId: ID!) {
    player(id: $id) {
      id
      slug
      fullName
      firstName
      lastName
      memberId
      gender
      sub
      competitionPlayer
      clubs {
        id
        slug
        name
        clubMembership {
          id
          membershipType
          active
          confirmed
        }
      }
      rankingLastPlaces(where: { systemId: $systemId }) {
        id
        single
        singlePoints
        double
        doublePoints
        mix
        mixPoints
        systemId
      }
    }
  }
`;

export interface PlayerDetailState {
  player: Player | null;
  teams: Team[];
  loaded: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class PlayerDetailService {
  private systemService = inject(RankingSystemService);
  private readonly apollo = inject(Apollo);

  private initialState: PlayerDetailState = {
    player: null,
    teams: [],
    loaded: false,
    error: null,
  };

  filter = new FormGroup({
    playerId: new FormControl<string>(''),
  });

  player = computed(() => this.state().player);
  teams = computed(() => this.state().teams);
  loaded = computed(() => this.state().loaded);
  error = computed(() => this.state().error);

  private filterChanged$ = combineLatest([
    this.filter.valueChanges.pipe(startWith(this.filter.value)),
    toObservable(this.systemService.systemId),
  ]).pipe(
    filter(([filter, systemId]) => !!filter.playerId && filter.playerId.length > 0 && !!systemId),
    map(([filter, systemId]) => ({
      ...filter,
      systemId,
    })),
    distinctUntilChanged(),
  );

  // sources
  private error$ = new Subject<string>();
  private data$ = this.filterChanged$.pipe(
    // throttleTime(300),
    switchMap((filter) =>
      this.getData(filter.playerId, filter.systemId).pipe(
        map((player) => ({ player, loaded: true, error: null })),
        startWith({ tournmaent: null, loaded: false, error: null }),
      ),
    ),
    delay(100), // some delay to show the loading indicator
    catchError((err) => {
      this.error$.next(err);
      return EMPTY;
    }),
  );

  sources$ = merge(
    this.data$,
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
    actionSources: {
      loadTeams: (_state, action$: Observable<void>) =>
        action$.pipe(
          switchMap(() => this.loadTeams(_state().player)),
          map((teams) => ({
            teams,
          })),
        ),

      removePlayer: (_state, action$: Observable<void>) =>
        action$.pipe(
          switchMap(() => this.removePlayer(_state().player)),
          switchMap(() => of({ player: null, loaded: false, error: null })),
        ),

      claimAccount: (_state, action$: Observable<void>) =>
        action$.pipe(
          switchMap(() => this.claimAccount(_state().player)),
          map(() => ({ player: null, loaded: true, error: null })),
        ),

      reCalculatePoints: (
        _state,
        action$: Observable<{
          from?: Date;
          to?: Date;
        } | void>,
      ) =>
        action$.pipe(
          switchMap((params) =>
            this.reCalculatePoints(
              _state().player,
              params ? params.from : undefined,
              params ? params.to : undefined,
            ),
          ),
          map(() => _state()),
        ),
    },
  });

  private getData(
    playerId?: string | null,
    systemId?: string | null,
    fetchPolicy?: FetchPolicy,
  ): Observable<Player | null> {
    if (!playerId) {
      return of(null);
    }

    return this.apollo
      .query<{ player: Partial<Player> }>({
        fetchPolicy,
        query: PLAYER_QUERY,
        variables: {
          id: playerId,
          systemId,
        },
      })
      .pipe(
        map((result) => {
          if (!result?.data.player) {
            throw new Error('No player');
          }

          return new Player(result.data.player);
        }),
      );
  }

  private removePlayer(player: Player | null) {
    return this.apollo.mutate({
      mutation: gql`
        mutation RemovePlayer($id: ID!) {
          removeEventPlayer(id: $id)
        }
      `,
      variables: {
        id: player?.id,
      },
    });
  }

  private reCalculatePoints(player: Player | null, from?: Date, to?: Date) {
    return this.apollo.mutate({
      mutation: gql`
        mutation RecalculatePlayerRankingPoints(
          $playerId: ID!
          $startDate: DateTime
          $endDate: DateTime
        ) {
          recalculatePlayerRankingPoints(
            playerId: $playerId
            startDate: $startDate
            endDate: $endDate
          )
        }
      `,
      variables: {
        playerId: player?.id,
        startDate: from,
        endDate: to,
      },
    });
  }

  private loadTeams(player: Player | null) {
    return this.apollo
      .query<{ player: { teams: Partial<Team>[] } }>({
        query: gql`
          query ClubsAndTeams($playerId: ID!) {
            player(id: $playerId) {
              id
              teams {
                id
                clubId
                slug
                teamMembership {
                  id
                  membershipType
                }
              }
            }
          }
        `,
        variables: {
          playerId: player?.id,
        },
      })
      .pipe(map((result) => result.data.player.teams.map((team) => new Team(team))));
  }

  claimAccount(player: Player | null) {
    return this.apollo.mutate({
      mutation: gql`
        mutation ClaimAccount($playerId: String!) {
          claimAccount(playerId: $playerId) {
            id
          }
        }
      `,
      variables: {
        playerId: player?.id,
      },
    });
  }
}
