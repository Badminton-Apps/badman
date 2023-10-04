import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  Injector,
  Input,
  OnInit,
  PLATFORM_ID,
  Signal,
  TransferState,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import {
  HasClaimComponent,
  RecentGamesComponent,
  UpcomingGamesComponent,
} from '@badman/frontend-components';
import { RankingSystemService } from '@badman/frontend-graphql';
import { Club, Player, Team } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { SubEventTypeEnum, getCurrentSeason } from '@badman/utils';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import moment from 'moment';
import { combineLatest, of } from 'rxjs';
import { map, startWith, switchMap, tap } from 'rxjs/operators';

enum CanPlay {
  Yes,
  Maybe,
  No,
  Na,
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

@Component({
  selector: 'badman-club-assembly',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,

    // Maeterial Modules
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatTableModule,
    MatTooltipModule,
    MatProgressBarModule,

    // Components
    HasClaimComponent,
    RecentGamesComponent,
    UpcomingGamesComponent,
  ],
  templateUrl: './club-assembly.component.html',
  styleUrls: ['./club-assembly.component.scss'],
})
export class ClubAssemblyComponent implements OnInit {
  // injects
  apollo = inject(Apollo);
  injector = inject(Injector);
  stateTransfer = inject(TransferState);
  platformId = inject(PLATFORM_ID);
  dialog = inject(MatDialog);
  systemService = inject(RankingSystemService);
  translateService = inject(TranslateService);
  changeDetectorRef = inject(ChangeDetectorRef);

  // signals
  teams?: Signal<Team[] | undefined>;
  players?: Signal<PlayerRow[] | undefined>;
  loading = signal(true);

  columns: string[] = [];
  // Inputs
  @Input({ required: true }) club?: Signal<Club>;
  @Input() filter?: FormGroup;

  canPlay = CanPlay;

  ngOnInit(): void {
    if (!this.filter) {
      this.filter = new FormGroup({
        season: new FormControl(getCurrentSeason()),
      });
    }

    effect(
      () => {
        this.teams = toSignal(
          this.filter?.valueChanges?.pipe(
            tap(() => {
              this.loading.set(true);
            }),
            startWith(this.filter.value ?? {}),
            switchMap((filter) => {
              return this.apollo.watchQuery<{ teams: Partial<Team>[] }>({
                query: gql`
                  query Teams(
                    $order: [SortOrderType!]
                    $teamsWhere: JSONObject
                  ) {
                    teams(order: $order, where: $teamsWhere) {
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
                      type
                      entry {
                        id
                        date
                        meta {
                          competition {
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
                            season
                          }
                        }
                      }
                    }
                  }
                `,
                variables: {
                  teamsWhere: {
                    clubId: this.club?.()?.id,
                    season: filter?.season,
                    type: filter?.choices,
                  },
                  order: [
                    {
                      field: 'type',
                      direction: 'desc',
                    },
                    {
                      field: 'teamNumber',
                      direction: 'asc',
                    },
                  ],
                },
              }).valueChanges;
            }),
            transferState(
              `clubTeamsKey-${this.club?.()?.id}`,
              this.stateTransfer,
              this.platformId
            ),
            map((result) => {
              if (!result?.data.teams) {
                throw new Error('No club');
              }
              return result.data.teams?.map((team) => new Team(team));
            }),
            tap((teams) => {
              this.columns = [
                'player',
                ...(teams?.map((team) => team.name ?? 'empty') ?? []),
              ];
            })
          ) ?? of([]),
          { injector: this.injector }
        );
      },
      { injector: this.injector }
    );

    effect(
      () => {
        if (this.teams?.()?.length) {
          this.players = toSignal(
            combineLatest([
              (this.filter?.valueChanges ?? of()).pipe(
                startWith(this.filter?.value.season ?? getCurrentSeason())
              ),
              this.systemService.getPrimarySystemId(),
            ]).pipe(
              switchMap(([filter, systemId]) => {
                const events = this.teams?.()
                  ?.map((e) => e?.entry?.subEventCompetition?.eventCompetition)
                  ?.filter((e) => e?.usedRankingUnit && e?.usedRankingAmount);

                const event = events?.[0];

                if (
                  !event ||
                  !event?.usedRankingUnit ||
                  !event?.usedRankingAmount
                ) {
                  return [];
                }

                const usedRankingDate = moment();
                usedRankingDate.set(
                  'year',
                  filter.season ?? event?.season ?? getCurrentSeason()
                );
                usedRankingDate.set(
                  event?.usedRankingUnit,
                  event?.usedRankingAmount
                );

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
                    clubId: this.club?.()?.id,
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
              transferState(
                `clubPlayerTeamsKey-${this.club?.()?.id}`,
                this.stateTransfer,
                this.platformId
              ),
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

                    for (const team of this.teams?.() ?? []) {
                      const sameTypeTeams =
                        this.teams?.()?.filter((t) => t.type == team.type) ??
                        [];
                      row[team.name ?? ''] = this.getCanPlay(
                        player,
                        team,
                        sameTypeTeams
                      );
                    }

                    return row;
                  }) ?? []
              ),
              tap(() => {
                this.loading.set(false);
              })
            ) ?? of([]),
            { injector: this.injector }
          );
        }
      },
      {
        injector: this.injector,
      }
    );
  }

  getCanPlay(
    player: Player,
    team: Team,
    otherTeams: Team[]
  ): {
    canPlay: CanPlay;
    reason?: string;
    base?: boolean;
  } {
    const base =
      (team.entry?.meta?.competition?.players?.findIndex(
        (p) => p.id == player.id
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
          }
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
          }
        ),
      };
    }

    // if player is part of meta competition, he can't play in any teams with a higher number

    const teamsWherePlayerIsBase = otherTeams?.find((t) =>
      t.entry?.meta?.competition?.players?.find(
        (p) => p.id == player.id && p.gender == player.gender
      )
    );

    if (teamsWherePlayerIsBase) {
      if ((team.teamNumber ?? 0) > (teamsWherePlayerIsBase?.teamNumber ?? 0)) {
        return {
          canPlay: CanPlay.No,
          reason: this.translateService.instant(
            'all.competition.club-assembly.warnings.base',
            {
              player,
            }
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
            }
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
        team.type == SubEventTypeEnum.MX ? mix : 12
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
                      .toLowerCase()
                  )
                  ?.join(', '),
              }
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
                }
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
