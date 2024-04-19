import { Injectable, computed, inject } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

import { RankingSystemService } from '@badman/frontend-graphql';
import { Club, Comment, Location, Team } from '@badman/frontend-models';
import { signalSlice } from 'ngxtension/signal-slice';
import { loadClub } from './queries/club';
import { loadTeams } from './queries/teams';
import { loadLocations } from './queries/locations';

interface TeamEnrollmentState {
  club: Club | null;
  email: string | null;
  season: number | null;

  teams: Team[];
  locations: Location[];
  comments: Comment[];
}

const CLUBS_KEY = 'clubs.id';

@Injectable({
  providedIn: 'root',
})
export class TeamEnrollmentDataService {
  private readonly apollo = inject(Apollo);
  private readonly systemService = inject(RankingSystemService);

  // state
  initialState: TeamEnrollmentState = {
    // Options
    teams: [],
    locations: [],
    email: null,

    // Selected
    club: null,
    season: null,
    comments: [],
  };

  // selectors
  club = computed(() => this.state().club);

  state = signalSlice({
    initialState: this.initialState,
    selectors: (state) => ({
      clubTeams: () => state().club?.teams ?? [],
      clubLocations: () => state().club?.locations ?? [],
    }),
    actionSources: {
      setSeason: (_state, action$: Observable<number>) =>
        action$.pipe(
          map((season) => ({
            season,
          })),
        ),
      setEmail: (_state, action$: Observable<string>) =>
        action$.pipe(
          map((email) => ({
            email,
          })),
        ),
      setClub: (_state, action$: Observable<string>) =>
        action$.pipe(
          tap((id) => sessionStorage.setItem(CLUBS_KEY, id)),
          switchMap((id) =>
            loadClub(this.apollo, id).pipe(map((club) => ({ club, teams: [], locations: [] }))),
          ),
        ),

      loadTeams: (_state, action$: Observable<string>) =>
        action$.pipe(
          tap((id) => sessionStorage.setItem(CLUBS_KEY, id)),
          switchMap((id) =>
            loadTeams(this.apollo, this.systemService, id, _state().season).pipe(
              map((teams) => {
                const club = _state().club;

                if (!club) {
                  throw new Error('Club not found');
                }

                club.teams = teams;
                return {
                  club,
                };
              }),
            ),
          ),
        ),
      loadLocations: (_state, action$: Observable<string>) =>
        action$.pipe(
          tap((id) => sessionStorage.setItem(CLUBS_KEY, id)),
          switchMap((id) =>
            loadLocations(this.apollo, id, _state().season).pipe(
              map((locations) => {
                const club = _state().club;

                if (!club) {
                  throw new Error('Club not found');
                }

                club.locations = locations;
                return {
                  club,
                };
              }),
            ),
          ),
        ),
    },

    actionEffects: (state) => ({
      setClub: async (action) => {
        state.loadTeams(action.value.club.id);
        state.loadLocations(action.value.club.id);
      },
    }),
  });
}
