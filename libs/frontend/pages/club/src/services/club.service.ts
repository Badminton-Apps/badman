import { Injectable, computed, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Club, Player } from '@badman/frontend-models';
import { getCurrentSeason } from '@badman/utils';
import { Apollo, gql } from 'apollo-angular';
import { signalSlice } from 'ngxtension/signal-slice';
import { EMPTY, Observable, Subject, merge, of } from 'rxjs';
import {
  catchError,
  delay,
  distinctUntilChanged,
  filter,
  map,
  startWith,
  switchMap,
  throttleTime,
} from 'rxjs/operators';

export interface ClubDetailState {
  club: Club | null;
  loaded: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ClubDetailService {
  private readonly apollo = inject(Apollo);

  private initialState: ClubDetailState = {
    club: null,
    loaded: false,
    error: null,
  };

  filter = new FormGroup({
    clubId: new FormControl<string>(''),
    season: new FormControl(getCurrentSeason()),
  });

  club = computed(() => this.state().club);
  loaded = computed(() => this.state().loaded);
  error = computed(() => this.state().error);

  private filterChanged$ = this.filter.valueChanges.pipe(
    startWith(this.filter.value),
    filter((filter) => !!filter.clubId && filter.clubId.length > 0),
    distinctUntilChanged(),
  );

  // sources
  private error$ = new Subject<string>();
  private clubLoaded = this.filterChanged$.pipe(
    throttleTime(300),
    switchMap((filter) =>
      this.getClub(filter.clubId).pipe(
        map((club) => ({ club, loaded: true, error: null })),
        startWith({ club: null, loaded: false, error: null }),
      ),
    ),
    delay(100), // some delay to show the loading indicator
    catchError((err) => {
      this.error$.next(err);
      return EMPTY;
    }),
  );

  sources$ = merge(
    this.clubLoaded,
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
      addPlayer: (_state, action$: Observable<Player>) =>
        action$.pipe(
          switchMap((player) => this.addPlayer(_state().club, player)),
          map(() => _state()),
        ),
    },
  });

  private getClub(clubId?: string | null): Observable<null | Club> {
    if (!clubId) {
      return of(null);
    }

    return this.apollo
      .query<{ club: Partial<Club> }>({
        query: gql`
          query Club($id: ID!) {
            club(id: $id) {
              id
              name
              slug
              fullName
              abbreviation
              teamName
              useForTeamName
              clubId
              country
              state
            }
          }
        `,
        variables: {
          id: clubId,
        },
      })
      .pipe(
        map((result) => {
          if (!result?.data.club) {
            throw new Error('No club');
          }
          return new Club(result.data.club);
        }),
      );
  }

  private addPlayer(club: Club | null, player: Player) {
    if (!club || !player) {
      return EMPTY;
    }

    return this.apollo.mutate<{ addPlayerToClub: boolean }>({
      mutation: gql`
        mutation AddPlayerToClub($data: ClubPlayerMembershipNewInput!) {
          addPlayerToClub(data: $data)
        }
      `,
      variables: {
        data: {
          clubId: club.id,
          playerId: player.id,
          start: new Date(),
        },
      },
    });
  }
}
