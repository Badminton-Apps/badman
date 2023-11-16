import { Injectable, computed, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { RankingSystemService } from '@badman/frontend-graphql';
import { Club, Player, Team } from '@badman/frontend-models';
import { SubEventTypeEnum, getCurrentSeason, sortTeams } from '@badman/utils';
import { TranslateService } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import moment from 'moment';
import { signalSlice } from 'ngxtension/signal-slice';
import {
  EMPTY,
  Subject,
  catchError,
  debounceTime,
  delay,
  distinctUntilChanged,
  filter,
  map,
  merge,
  startWith,
  switchMap,
} from 'rxjs';

export interface ClubAssemblyState {
  teams: Team[];
  players: PlayerRow[];
  loaded: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ClubAssemblyService {
  private apollo = inject(Apollo);
  private systemService = inject(RankingSystemService);
  private translateService = inject(TranslateService);

  private initialState: ClubAssemblyState = {
    teams: [],
    players: [],
    loaded: false,
    error: null,
  };

  filter = new FormGroup({
    clubId: new FormControl<string>(''),
    season: new FormControl(getCurrentSeason()),
    choices: new FormControl<string[]>([]),
  });

  teams = computed(() => this.state().teams);
  players = computed(() => this.state().players);
  loaded = computed(() => this.state().loaded);
  error = computed(() => this.state().error);

  private filterChanged$ = this.filter.valueChanges.pipe(
    startWith(this.filter.value),
    filter((filter) => !!filter.clubId && filter.clubId.length > 0),
    debounceTime(300),
    distinctUntilChanged(),
  );

  // sources
  private error$ = new Subject<string>();
  private teamsLoaded$ = this.filterChanged$.pipe(
    switchMap((filter) =>
      this.getTeams(filter).pipe(
        map((teams) => teams.sort(sortTeams)),
        switchMap((teams) =>
          this.getPlayers(teams, this.filter.value).pipe(
            map((players) => ({ teams, players, loaded: true })),
          ),
        ),
      ),
    ),
    delay(100), // some delay to show the loading indicator
    catchError((err) => {
      this.error$.next(err);
      return EMPTY;
    }),
  );

  sources$ = merge(
    this.teamsLoaded$,
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

  private getTeams(
    filter: Partial<{
      clubId: string | null;
      season: number | null;
      choices: string[] | null;
    }>,
  ) {
    return this.apollo
      .watchQuery<{ teams: Partial<Team>[] }>({
        query: gql`
          query Teams($teamsWhere: JSONObject) {
            teams(where: $teamsWhere) {
              id
              name
              slug
              teamNumber
              season
              captainId
              type
              clubId
              email
              phone
              preferredDay
              preferredTime
              entry {
                id
                date
                meta {
                  competition {
                    teamIndex
                    players {
                      id
                      single
                      double
                      mix
                      gender
                    }
                  }
                }
                subEventCompetition {
                  id
                  name
                  maxLevel
                  eventCompetition {
                    id
                    usedRankingUnit
                    usedRankingAmount
                  }
                }
                standing {
                  id
                  position
                  size
                }
              }
            }
          }
        `,
        variables: {
          teamsWhere: {
            clubId: filter.clubId,
            season: filter?.season,
            type: filter?.choices,
          },
        },
      })
      .valueChanges.pipe(
        map((result) => result.data?.teams ?? []),
        map((result) => result?.map((t) => new Team(t))),
      );
  }

  private getPlayers(
    teams: Team[],
    filter: Partial<{
      clubId: string | null;
      season: number | null;
      choices: string[] | null;
    }>,
  ) {
    return this.systemService.getPrimarySystemId().pipe(
      switchMap((systemId) => {
        const events = teams
          ?.map((e) => e?.entry?.subEventCompetition?.eventCompetition)
          ?.filter((e) => e?.usedRankingUnit && e?.usedRankingAmount);
        const event = events?.[0];

        if (!event || !event?.usedRankingUnit || !event?.usedRankingAmount) {
          return [];
        }

        const usedRankingDate = moment();
        usedRankingDate.set(
          'year',
          filter.season ?? event?.season ?? getCurrentSeason(),
        );
        usedRankingDate.set(event?.usedRankingUnit, event?.usedRankingAmount);

        // get first and last of the month
        const startRanking = moment(usedRankingDate).startOf('month');
        const endRanking = moment(usedRankingDate).endOf('month');

        return this.apollo.watchQuery<{ club: Partial<Club> }>({
          query: gql`
            query ClubPlayers(
              $playersWhere: JSONObject
              $clubId: ID!
              $order: [SortOrderType!]
              $orderPlaces: [SortOrderType!]
              $rankingWhere: JSONObject
              $lastRankginWhere: JSONObject
            ) {
              club(id: $clubId) {
                id
                players(where: $playersWhere, order: $order) {
                  id
                  lastName
                  firstName
                  gender
                  slug
                  rankingLastPlaces(where: $lastRankginWhere) {
                    id
                    single
                    double
                    mix
                  }
                  rankingPlaces(
                    where: $rankingWhere
                    order: $orderPlaces
                    take: 1
                  ) {
                    id
                    rankingDate
                    single
                    double
                    mix
                  }
                }
              }
            }
          `,
          variables: {
            clubId: filter.clubId,
            playersWhere: {
              competitionPlayer: true,
            },
            order: [
              {
                field: 'lastName',
                direction: 'asc',
              },
              {
                field: 'firstName',
                direction: 'asc',
              },
            ],
            orderPlaces: [
              {
                field: 'rankingDate',
                direction: 'desc',
              },
            ],
            rankingWhere: {
              rankingDate: {
                $between: [startRanking, endRanking],
              },
              systemId,
            },
            lastRankginWhere: {
              systemId,
            },
          },
        }).valueChanges;
      }),
      map((result) => {
        if (!result?.data.club) {
          throw new Error('No club');
        }
        return new Club(result.data.club);
      }),
      map(
        (club) =>
          club.players?.map((player) => {
            const row = {
              player: player,
            } as PlayerRow;

            for (const team of teams ?? []) {
              const sameTypeTeams =
                teams?.filter((t) => t.type == team.type) ?? [];
              row[team.name ?? ''] = this.getCanPlay(
                player,
                team,
                sameTypeTeams,
              );
            }

            return row;
          }) ?? [],
      ),
    );
  }

  getCanPlay(
    player: Player,
    team: Team,
    otherTeams: Team[],
  ): {
    canPlay: CanPlay;
    reason?: string;
    base?: boolean;
  } {
    const base =
      (team.entry?.meta?.competition?.players?.findIndex(
        (p) => p.id == player.id,
      ) ?? -1) > -1;

    // base players can play in their own team
    if (base) {
      return {
        canPlay: CanPlay.Yes,
        base,
        reason: this.translateService.instant(`all.player.base`),
      };
    }

    // We can't play in other gender's team
    if (player.gender == 'M' && team.type == SubEventTypeEnum.F) {
      return {
        canPlay: CanPlay.Na,
        reason: this.translateService.instant(
          'all.competition.club-assembly.warnings.other-gender',
          {
            player,
            playerGender: this.translateService
              .instant(`all.gender.longs.${player.gender.toUpperCase()}`)
              .toLowerCase(),
            teamType: this.translateService
              .instant(`all.team.types.long.${team.type.toUpperCase()}`)
              .toLowerCase(),
          },
        ),
      };
    } else if (player.gender == 'F' && team.type == SubEventTypeEnum.M) {
      return {
        canPlay: CanPlay.Na,
        reason: this.translateService.instant(
          'all.competition.club-assembly.warnings.other-gender',
          {
            player,
            playerGender: this.translateService
              .instant(`all.gender.longs.${player.gender.toUpperCase()}`)
              .toLowerCase(),
            teamType: this.translateService
              .instant(`all.team.types.long.${team.type.toUpperCase()}`)
              .toLowerCase(),
          },
        ),
      };
    }

    // if player is part of meta competition, he can't play in any teams with a higher number

    const teamsWherePlayerIsBase = otherTeams?.find(
      (t) =>
        t.entry?.meta?.competition?.players?.find(
          (p) => p.id == player.id && p.gender == player.gender,
        ),
    );

    if (teamsWherePlayerIsBase) {
      if ((team.teamNumber ?? 0) > (teamsWherePlayerIsBase?.teamNumber ?? 0)) {
        return {
          canPlay: CanPlay.No,
          reason: this.translateService.instant(
            'all.competition.club-assembly.warnings.base',
            {
              player,
            },
          ),
        };
      }

      // if the player is part of the base, all teams of that same subevent he can't play in
      if (
        team.id != teamsWherePlayerIsBase.id &&
        teamsWherePlayerIsBase.entry?.subEventCompetition?.id ==
          team.entry?.subEventCompetition?.id
      ) {
        return {
          canPlay: CanPlay.No,
          reason: this.translateService.instant(
            'all.competition.club-assembly.warnings.base-subevent',
            {
              player,
            },
          ),
        };
      }
    }

    // check if the player has any ranking lower then the event
    const ranking = player.rankingPlaces?.[0];
    if (ranking) {
      const event = team.entry?.subEventCompetition;
      const single = ranking.single ?? 12;
      const double = ranking.double ?? 12;
      const mix = ranking.mix ?? 12;
      const minLevel = Math.min(
        single ?? 12,
        double ?? 12,
        team.type == SubEventTypeEnum.MX ? mix : 12,
      );

      if (event) {
        const types = [];

        if (single == minLevel && single < (event.maxLevel ?? 12)) {
          types.push('single');
        }

        if (double == minLevel && double < (event.maxLevel ?? 12)) {
          types.push('double');
        }

        if (
          team.type == SubEventTypeEnum.MX &&
          mix == minLevel &&
          mix < (event.maxLevel ?? 12)
        ) {
          types.push('mix');
        }

        if (types.length) {
          return {
            canPlay: CanPlay.No,
            reason: this.translateService.instant(
              'all.competition.club-assembly.warnings.min-level',
              {
                player,
                maxLevel: event.maxLevel,
                level: minLevel,
                type: types
                  ?.map((t) =>
                    this.translateService
                      .instant(`all.game.types.${t}`)
                      .toLowerCase(),
                  )
                  ?.join(', '),
              },
            ),
          };
        }
      }

      if (
        !team.entry?.meta?.competition?.players?.find((p) => p.id == player.id)
      ) {
        // check if the player is better then any of the meta players (if he is not part of the meta)
        for (const entryPlayer of team.entry?.meta?.competition?.players ??
          []) {
          const entrySum =
            entryPlayer.single +
            entryPlayer.double +
            (team.type == SubEventTypeEnum.MX ? entryPlayer.mix : 0);
          const playerSum =
            single + double + (team.type == SubEventTypeEnum.MX ? mix : 0);

          if (playerSum < entrySum && entryPlayer.gender == player.gender) {
            return {
              canPlay: CanPlay.Maybe,
              reason: this.translateService.instant(
                'all.competition.club-assembly.warnings.better-meta',
                {
                  player,
                },
              ),
            };
          }
        }
      }
    }

    return {
      canPlay: CanPlay.Yes,
    };
  }
}

type PlayerRow = {
  player: Player;
} & {
  [key: string]: {
    canPlay: CanPlay;
    reason?: string;
    base?: boolean;
  };
};

export enum CanPlay {
  Yes,
  Maybe,
  No,
  Na,
}
