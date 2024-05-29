import { Injectable, computed, inject } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

import { RankingSystemService } from '@badman/frontend-graphql';
import {
  Club,
  ClubPlayer,
  Comment,
  EventCompetition,
  Location,
  SubEventCompetition,
  Team,
  TeamValidationResult,
} from '@badman/frontend-models';
import {
  ClubMembershipType,
  LevelType,
  SubEventTypeEnum,
  sortSubEventOrder,
  sortTeams,
} from '@badman/utils';
import { signalSlice } from 'ngxtension/signal-slice';
import { TeamFormValue } from '../team-enrollment.page';
import { loadClub } from './queries/club';
import { loadComments } from './queries/comments';
import { loadEvents } from './queries/events';
import { loadLocations } from './queries/locations';
import { loadTeams } from './queries/teams';
import { loadTransersAndLoans } from './queries/transfers';
import { validateEnrollment } from './queries/validate';

interface TeamEnrollmentState {
  club: Club | null;
  season: number | null;

  teams: Team[];
  transfers: ClubPlayer[];
  loans: ClubPlayer[];
  locations: Location[];
  comments: Comment[];
  events: EventCompetition[];

  validation: TeamValidationResult[];

  loadedClubs: boolean;
  loadedTeams: boolean;
  loadedTransfers: boolean;
  loadedLocations: boolean;
  loadedComments: boolean;
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
    transfers: [],
    loans: [],

    // Selected
    club: null,
    season: null,
    comments: [],
    events: [],
    validation: [],

    // loading steps
    loadedClubs: false,
    loadedTeams: false,
    loadedTransfers: false,
    loadedLocations: false,
    loadedComments: false,
  };

  // selectors
  club = computed(() => this.state().club);

  state = signalSlice({
    initialState: this.initialState,
    selectors: (state) => ({
      allLoaded: () =>
        state().loadedClubs &&
        state().loadedTeams &&
        state().loadedLocations &&
        state().loadedTransfers,
      eventsPerType: () => {
        const subEvents = state()
          .events.map((event) => event.subEventCompetitions ?? [])
          .reduce((acc, val) => acc.concat(val), [] as SubEventCompetition[]);

        return {
          [SubEventTypeEnum.M]: subEvents
            .filter((subEvent) => subEvent.eventType === 'M')
            .sort(sortSubEventOrder),
          [SubEventTypeEnum.F]: subEvents
            .filter((subEvent) => subEvent.eventType === 'F')
            .sort(sortSubEventOrder),
          [SubEventTypeEnum.MX]: subEvents
            .filter(
              (subEvent) =>
                subEvent?.eventType === 'MX' &&
                subEvent?.eventCompetition?.type &&
                subEvent?.eventCompetition?.type != LevelType.NATIONAL,
            )
            .sort(sortSubEventOrder),
          [SubEventTypeEnum.NATIONAL]: subEvents
            .filter(
              (subEvent) =>
                subEvent?.eventType === 'MX' &&
                subEvent?.eventCompetition?.type &&
                subEvent?.eventCompetition?.type == LevelType.NATIONAL,
            )
            .sort(sortSubEventOrder),
        };
      },
      hadEntries: () => {
        return state().teams.some((team) => team.entry?.sendOn != null);
      },
    }),
    actionSources: {
      setSeason: (_state, action$: Observable<number>) =>
        action$.pipe(
          map((season) => ({
            season,
          })),
        ),
      setClub: (_state, action$: Observable<string>) =>
        action$.pipe(
          tap((id) => sessionStorage.setItem(CLUBS_KEY, id)),
          switchMap((id) => loadClub(this.apollo, id)),
          map((club) => ({
            club,
            teams: [],
            locations: [],
            comments: [],
            transfers: [],
            loadedClubs: true,
            loadedTeams: false,
            loadedTransfers: false,
            loadedLocations: false,
            loadedComments: false,
          })),
        ),

      clear: (_state, action$: Observable<void>) =>
        action$.pipe(
          map(() => ({
            club: null,
            teams: [],
            locations: [],
            comments: [],
            transfers: [],
            loadedClubs: false,
            loadedTeams: false,
            loadedTransfers: false,
            loadedLocations: false,
            loadedComments: false,
          })),
        ),

      // Load stuff
      loadTeams: (_state, action$: Observable<{ clubId: string; season: number }>) =>
        action$.pipe(
          switchMap(({ clubId, season }) =>
            loadTeams(this.apollo, this.systemService, clubId, season),
          ),
          map((teams) => {
            const club = _state().club;

            if (!club) {
              throw new Error('Club not found');
            }

            club.teams =
              teams?.filter((team) => team.season !== _state().season)?.sort(sortTeams) ?? [];
            return {
              club,
              teams:
                teams?.filter((team) => team.season === _state().season)?.sort(sortTeams) ?? [],
              loadedTeams: true,
            };
          }),
        ),
      loadLocations: (_state, action$: Observable<{ clubId: string; season: number }>) =>
        action$.pipe(
          switchMap(({ clubId, season }) => loadLocations(this.apollo, clubId, season)),
          map((locations) => {
            const club = _state().club;
            const season = _state().season;

            if (!club) {
              throw new Error('Club not found');
            }

            if (!season) {
              throw new Error('Season not found');
            }

            club.locations = locations;

            for (const location of locations) {
              const curr = location.availabilities.filter(
                (availability) => availability.season === season,
              );

              if (curr.length === 0) {
                // copy previous season
                const prev = location.availabilities
                  .filter((availability) => availability.season === season - 1)
                  ?.map((availability) => {
                    availability.exceptions = [];
                    availability.season = season;
                    return availability;
                  });

                location.availabilities = prev;
              }
            }

            return {
              club,
              loadedLocations: true,
            };
          }),
        ),

      loadTransersAndLoans: (_state, action$: Observable<{ clubId: string; season: number }>) =>
        action$.pipe(
          switchMap(({ clubId, season }) => loadTransersAndLoans(this.apollo, clubId, season)),
          map((transfers) => ({
            transfers: transfers.filter(
              (player) => player.clubMembership.membershipType === ClubMembershipType.NORMAL,
            ),
            loans: transfers.filter(
              (player) => player.clubMembership.membershipType === ClubMembershipType.LOAN,
            ),
            loadedTransfers: true,
          })),
        ),

      loadEvents: (_state, action$: Observable<{ state: string }>) =>
        action$.pipe(
          switchMap(({ state }) => loadEvents(this.apollo, state)),
          map((events) => ({
            events,
          })),
        ),

      loadComments: (_state, action$: Observable<{ clubId: string; eventIds: string[] }>) =>
        action$.pipe(
          switchMap(({ clubId, eventIds }) => loadComments(this.apollo, clubId, eventIds)),
          map((comments) => ({
            comments,
            loadedComments: true,
          })),
        ),

      validateEnrollment: (
        _state,
        action$: Observable<{
          teamForm?: { [key in SubEventTypeEnum]: TeamFormValue[] };
          season?: number;
          clubId: string;
          transfers?: string[];
          loans?: string[];
        }>,
      ) =>
        action$.pipe(
          switchMap(({ teamForm, season, clubId, transfers, loans }) =>
            validateEnrollment(this.apollo, teamForm, season, clubId, transfers, loans),
          ),
          map((validation) => ({
            validation,
          })),
        ),
    },

    actionEffects: (state) => ({
      setClub: () => {
        const club = state().club;
        const season = state().season;

        if (!club || !club.state || !season) {
          console.warn('setClub', 'no club, state or season');
          return;
        }

        state.loadTeams({ clubId: club.id, season });
        state.loadTransersAndLoans({ clubId: club.id, season });
        state.loadLocations({ clubId: club.id, season });
        state.loadEvents({ state: club.state });
      },
      loadEvents: () => {
        const club = state().club;
        const events = state().events;

        if (!club || events.length <= 0) {
          console.warn('loadEvents', 'no club or events');
          return;
        }

        state.loadComments({
          clubId: club.id,
          eventIds: events.map((event) => event.id),
        });
      },
    }),
  });
}
