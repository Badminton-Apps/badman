import { Injectable, inject } from '@angular/core';
import { EncounterCompetition, EventCompetition, Player, Team } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { signalSlice } from 'ngxtension/signal-slice';
import { Observable, delay, distinctUntilChanged, filter, map, shareReplay, switchMap } from 'rxjs';
import { ValidationMessage, ValidationResult } from '../../models/validation';
import { RankingSystemService } from '@badman/frontend-graphql';
import moment from 'moment';
import { TeamMembershipType } from '@badman/utils';

export type IndexPlayer = Player & {
  single: number;
  double: number;
  mix: number;
  sum: number;
};

export interface IndexPlayers {
  index: number;
  players: IndexPlayer[];
}

export interface AssemblyState {
  // state
  loaded: boolean;
  errors: ValidationMessage[];
  warnings: ValidationMessage[];

  // team
  captain: Player;
  teamId: string;
  encounterId: string;

  // type
  team: Team;

  // singles
  single1: Player | undefined;
  single2: Player | undefined;
  single3: Player | undefined;
  single4: Player | undefined;
  // doubles
  double1: [Player, Player] | undefined;
  double2: [Player, Player] | undefined;
  double3: [Player, Player] | undefined;
  double4: [Player, Player] | undefined;

  // index
  titulars: IndexPlayers;
  base: IndexPlayers;
}

export const SAVED_ASSEMBLY = gql`
  query SavedAssembly($id: ID!, $where: JSONObject) {
    encounterCompetition(id: $id) {
      id
      assemblies(where: $where) {
        id
        assembly {
          single1
          single2
          single3
          single4
          double1
          double2
          double3
          double4
          subtitudes
        }
        captainId
      }
    }
  }
`;

@Injectable({
  providedIn: 'root',
})
export class AssemblyService {
  private apollo = inject(Apollo);
  private systemService = inject(RankingSystemService);

  private initialState = {
    loaded: false,
  } as AssemblyState;

  // validate
  private _validate(state: AssemblyState) {
    return this.apollo.query<{ assemblyValidation: ValidationResult }>({
      query: gql`
        query AssemblyValidation($assembly: AssemblyInput!) {
          assemblyValidation(assembly: $assembly) {
            baseTeamIndex
            baseTeamPlayers {
              id
              fullName
              single
              double
              mix
            }

            titularsIndex
            titularsPlayers {
              id
              fullName
              single
              double
              mix
            }
            valid

            errors {
              params
              message
            }
            warnings {
              params
              message
            }
          }
        }
      `,
      variables: {
        assembly: {
          teamId: state.teamId,
          encounterId: state.encounterId,

          single1: state.single1?.id,
          single2: state.single2?.id,
          single3: state.single3?.id,
          single4: state.single4?.id,

          double1: state.double1?.map((r) => r?.id),
          double2: state.double2?.map((r) => r?.id),
          double3: state.double3?.map((r) => r?.id),
          double4: state.double4?.map((r) => r?.id),
        },
      },
    });
  }

  private _getTeam(encounterId: string, teamId: string) {
    return this._getRankingWhere(encounterId).pipe(
      distinctUntilChanged(),
      switchMap((where) =>
        this.apollo
          .query<{ team: Partial<Team> }>({
            query: gql`
              query TeamInfo($id: ID!, $rankingWhere: JSONObject, $lastRankginWhere: JSONObject) {
                team(id: $id) {
                  id
                  captainId
                  clubId
                  teamNumber
                  type
                  captainId
                  phone
                  email
                  season
                  preferredDay
                  preferredTime
                  players {
                    id
                    slug
                    fullName
                    gender
                    competitionPlayer
                    rankingLastPlaces(where: $lastRankginWhere) {
                      id
                      single
                      double
                      mix
                    }
                    rankingPlaces(where: $rankingWhere) {
                      id
                      rankingDate
                      single
                      double
                      mix
                    }
                    membershipType
                    teamId
                  }
                  entry {
                    id
                    meta {
                      competition {
                        players {
                          id
                          levelException
                        }
                      }
                    }
                  }
                }
              }
            `,
            variables: {
              id: teamId,
              ...where,
            },
          })
          .pipe(
            map((result) => {
              if (!result?.data.team) {
                throw new Error('No club');
              }

              return new Team(result.data.team);
            }),
          ),
      ),
    );
  }

  private _getRankingWhere(encounterId: string) {
    // Combine _getEvent and _getEncounter
    return this._getEvent(encounterId).pipe(
      map((event) => {
        if (!event || !event.season || !event.usedRankingUnit || !event.usedRankingAmount) {
          throw new Error('No event');
        }

        const usedRankingDate = moment();
        usedRankingDate.set('year', event.season);
        usedRankingDate.set(event.usedRankingUnit, event.usedRankingAmount);

        const startRanking = usedRankingDate.clone().set('date', 0);
        const endRanking = usedRankingDate.clone().clone().endOf('month');

        return {
          rankingWhere: {
            rankingDate: {
              $between: [startRanking, endRanking],
            },
            systemId: this.systemService.systemId(),
          },
          lastRankginWhere: {
            systemId: this.systemService.systemId(),
          },
        };
      }),
      shareReplay(1),
    );
  }

  private _getEvent(encounterCompetitionId: string) {
    return this.apollo
      .query<{ encounterCompetition: Partial<EncounterCompetition> }>({
        query: gql`
          query EncounterCompetition($encounterCompetitionId: ID!) {
            encounterCompetition(id: $encounterCompetitionId) {
              id
              drawCompetition {
                id
                subEventCompetition {
                  id
                  eventType
                  eventCompetition {
                    id
                    season
                    usedRankingUnit
                    usedRankingAmount
                  }
                }
              }
            }
          }
        `,
        variables: {
          encounterCompetitionId,
        },
      })
      .pipe(
        map((result) => result?.data.encounterCompetition?.drawCompetition?.subEventCompetition),
        map((result) => {
          if (!result?.eventCompetition) {
            throw new Error('No event');
          }

          // this.type = result?.eventType;

          return new EventCompetition(result?.eventCompetition);
        }),
      );
  }

  state = signalSlice({
    initialState: this.initialState,

    actionSources: {
      setInfo: (
        _state,
        action$: Observable<{
          teamId: string | undefined;
          encounterId: string | undefined;
        }>,
      ) =>
        action$.pipe(
          delay(1),
          map(
            (data) =>
              ({
                teamId: data.teamId,
                encounterId: data.encounterId,

                base: {
                  index: 0,
                  players: [] as IndexPlayer[],
                },

                titulars: {
                  index: 0,
                  players: [] as IndexPlayer[],
                },

                single1: undefined,
                single2: undefined,
                single3: undefined,
                single4: undefined,

                double1: undefined,
                double2: undefined,
                double3: undefined,
                double4: undefined,
                loaded: false,
              }) as AssemblyState,
          ),
        ),

      validate: (state, action$: Observable<void>) =>
        action$.pipe(
          filter(() => !!state().encounterId && !!state().teamId),
          switchMap(() => this._validate(state())),
          map((data) => {
            return {
              titulars: {
                index: data.data?.assemblyValidation.titularsIndex ?? 0,
                players: data.data?.assemblyValidation.titularsPlayers?.map((p) => ({
                  ...p,
                  sum: p.single + p.double + ((state()?.team?.type ?? 'MX') === 'MX' ? p.mix : 0),
                })),
              },
              base: {
                index: data.data?.assemblyValidation.baseTeamIndex ?? 0,
                players: data.data?.assemblyValidation.baseTeamPlayers?.map((p) => ({
                  ...p,
                  sum: p.single + p.double + ((state()?.team?.type ?? 'MX') === 'MX' ? p.mix : 0),
                })),
              },
              errors: data.data?.assemblyValidation.errors ?? [],
              warnings: data.data?.assemblyValidation.warnings ?? [],
              loaded: true,
            } as AssemblyState;
          }),
        ),

      loadTeam: (state, action$: Observable<void>) =>
        action$.pipe(
          filter(() => !!state().encounterId && !!state().teamId),
          switchMap(() => this._getTeam(state().encounterId, state().teamId)),
          map((data) => ({
            team: new Team(data),
          })),
        ),

      setSingle: (_, action$: Observable<{ index: 1 | 2 | 3 | 4; player: Player }>) =>
        action$.pipe(
          map((data) => ({
            [`single${data.index}`]: data.player,
          })),
        ),

      setDouble: (
        state,
        action$: Observable<{
          index: 1 | 2 | 3 | 4;
          index2: 0 | 1;
          player: Player | undefined;
        }>,
      ) =>
        action$.pipe(
          map((data) => {
            const key = `double${data.index}` as keyof AssemblyState;
            const current = (state()[key] ?? []) as [Player | undefined, Player | undefined];

            current[data.index2] = data.player;

            return {
              [key]: current,
            };
          }),
        ),
    },
    actionEffects: (state) => ({
      setInfo: () => {
        state.loadTeam();
      },
      loadTeam: () => {
        state.validate();
      },
      setSingle: () => {
        state.validate();
      },
      setDouble: () => {
        state.validate();
      },
    }),
    selectors: (state) => ({
      type: () => state().team?.type,

      metaPlayers: () => state().team?.entry?.meta?.competition?.players ?? [],
      regularPlayers: () =>
        state().team?.players?.filter((p) => p.membershipType === TeamMembershipType.REGULAR) ?? [],
      backupPlayers: () =>
        state().team?.players?.filter((p) => p.membershipType === TeamMembershipType.BACKUP) ?? [],
    }),
  });
}
