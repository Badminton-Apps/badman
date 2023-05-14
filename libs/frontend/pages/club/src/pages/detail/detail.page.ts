import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  TransferState,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { SeoService } from '@badman/frontend-seo';
import { Apollo, gql } from 'apollo-angular';

import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import {
  AddPlayerComponent,
  HasClaimComponent,
  LoadingBlockComponent,
  PageHeaderComponent,
  RecentGamesComponent,
  UpcomingGamesComponent,
} from '@badman/frontend-components';
import {
  Club,
  EncounterCompetition,
  Player,
  Team,
} from '@badman/frontend-models';
import { TwizzitService } from '@badman/frontend-twizzit';
import { transferState } from '@badman/frontend-utils';
import { SubEventTypeEnum, getCurrentSeason } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { MomentModule } from 'ngx-moment';
import { Observable, Subject, combineLatest, lastValueFrom } from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  startWith,
  switchMap,
  take,
  takeUntil,
} from 'rxjs/operators';
import { BreadcrumbService } from 'xng-breadcrumb';

@Component({
  selector: 'badman-club-detail',
  templateUrl: './detail.page.html',
  styleUrls: ['./detail.page.scss'],
  standalone: true,
  imports: [
    // Core modules
    CommonModule,
    ReactiveFormsModule,
    RouterModule,

    // Other modules
    MomentModule,
    TranslateModule,

    // My Modules
    UpcomingGamesComponent,
    RecentGamesComponent,
    PageHeaderComponent,
    HasClaimComponent,
    LoadingBlockComponent,

    // Material Modules
    MatButtonToggleModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    MatDialogModule,
    MatSelectModule,
    MatProgressBarModule,
  ],
})
export class DetailPageComponent implements OnInit, OnDestroy {
  club!: Club;
  filter!: FormGroup;

  update$ = new Subject<void>();
  destroy$ = new Subject<void>();
  teams$!: Observable<Team[]>;
  players$!: Observable<{ player: Player; teams: number }[]>;
  recentEncounters$!: Observable<EncounterCompetition[]>;
  upcomingEncounters$!: Observable<EncounterCompetition[]>;
  seasons = [getCurrentSeason()];

  constructor(
    private formBuilder: FormBuilder,
    private seoService: SeoService,
    private breadcrumbsService: BreadcrumbService,
    private apollo: Apollo,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private twizzitService: TwizzitService,
    private stateTransfer: TransferState,
    @Inject(PLATFORM_ID) private platformId: string
  ) {}

  get isClient(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.filter = this.formBuilder.group({
      choices: [['M', 'F', 'MX', 'NATIONAL']],
      season: getCurrentSeason(),
    });

    this.route.data.subscribe((data) => {
      this.club = data['club'];

      const clubName = `${this.club.name}`;

      this.seoService.update({
        title: clubName,
        description: `Club ${clubName}`,
        type: 'website',
        keywords: ['club', 'badminton'],
      });
      this.breadcrumbsService.set('@club', clubName);

      this._getYears().then((years) => {
        if (years.length > 0) {
          this.seasons = years;
        }
      });

      const filters$ = combineLatest([
        this.filter.valueChanges.pipe(startWith(this.filter.value)),
        this.update$.pipe(startWith(null)),
      ]).pipe(
        shareReplay(1),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        takeUntil(this.destroy$)
      );

      this.teams$ = filters$.pipe(
        switchMap(([filter]) => this._loadTeams(filter))
      );

      this.players$ = filters$.pipe(
        switchMap(([filter]) => this._loadPlayers(filter))
      );
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private _getYears() {
    return lastValueFrom(
      this.apollo
        .query<{
          teams: Partial<Team[]>;
        }>({
          query: gql`
            query CompetitionYears($where: JSONObject) {
              teams(where: $where) {
                id
                season
              }
            }
          `,
          variables: {
            where: {
              clubId: this.club.id,
            },
          },
        })
        .pipe(
          transferState(
            `club-${this.club.id}-seasons`,
            this.stateTransfer,
            this.platformId
          ),
          map((result) => {
            if (!result?.data.teams) {
              throw new Error('No teams');
            }
            return result.data.teams.map((row) => row?.season as number);
          }),
          // map distinct years
          map((years) => [...new Set(years)]),
          // sort years
          map((years) => years.sort((a, b) => b - a))
        )
    );
  }

  private _loadTeams(filter: {
    choices: string[];
    season?: number;
  }): Observable<Team[]> {
    return this.apollo
      .watchQuery<{ teams: Partial<Team>[] }>({
        query: gql`
          query Teams($order: [SortOrderType!], $teamsWhere: JSONObject) {
            teams(order: $order, where: $teamsWhere) {
              id
              name
              slug
              teamNumber
              season
              captainId
              type
              entry {
                id
                date
                subEventCompetition {
                  id
                  name
                }
              }
            }
          }
        `,
        variables: {
          teamsWhere: {
            clubId: this.club.id,
            season: filter?.season || getCurrentSeason(),
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
      })
      .valueChanges.pipe(
        transferState(
          `clubTeamsKey-${this.club.id}`,
          this.stateTransfer,
          this.platformId
        ),
        map((result) => {
          if (!result?.data.teams) {
            throw new Error('No club');
          }
          return result.data.teams?.map((team) => new Team(team));
        })
      );
  }

  private _loadPlayers(filter: {
    choices: string[];
    season?: number;
  }): Observable<
    {
      player: Player;
      teams: number;
    }[]
  > {
    return this.apollo
      .watchQuery<{ club: Partial<Club> }>({
        query: gql`
          query PlayersForTeams($teamsWhere: JSONObject, $clubId: ID!) {
            club(id: $clubId) {
              id
              players {
                id
                fullName
                slug
                teams(where: $teamsWhere) {
                  id
                }
              }
            }
          }
        `,
        variables: {
          clubId: this.club.id,
          teamsWhere: {
            season: filter?.season || getCurrentSeason(),
            type: filter?.choices,
          },
        },
      })
      .valueChanges.pipe(
        transferState(
          `clubPlayerTeamsKey-${this.club.id}`,
          this.stateTransfer,
          this.platformId
        ),
        map((result) => {
          if (!result?.data.club) {
            throw new Error('No club');
          }
          return new Club(result.data.club);
        }),
        map((club) => {
          return (club.players ?? []).map((player) => {
            return {
              player,
              teams: (player.teams ?? []).length,
            };
          });
        })
      );
  }

  editTeam(team: Team) {
    this.teams$
      .pipe(
        takeUntil(this.destroy$),
        take(1),
        switchMap((teams) =>
          import('@badman/frontend-team').then((m) => {
            this.dialog
              .open(m.EditDialogComponent, {
                data: {
                  team: team,
                  teamNumbers: {
                    [team.type ?? 'M']: teams
                      ?.filter((t) => t.type == team.type)
                      ?.map((t) => t.teamNumber),
                  },
                },

                width: '100%',
                maxWidth: '600px',
              })
              .afterClosed();
          })
        )
      )
      .subscribe(() => {
        this.update$.next();
      });
  }

  addTeam() {
    this.teams$
      .pipe(
        takeUntil(this.destroy$),
        take(1),
        switchMap((teams) =>
          import('@badman/frontend-team').then((m) => {
            this.dialog
              .open(m.AddDialogComponent, {
                data: {
                  team: {
                    clubId: this.club.id,
                    season: this.filter.value.season,
                  },
                  teamNumbers: {
                    [SubEventTypeEnum.M]: teams
                      ?.filter((t) => t.type == SubEventTypeEnum.M)
                      ?.map((t) => t.teamNumber),
                    [SubEventTypeEnum.F]: teams
                      ?.filter((t) => t.type == SubEventTypeEnum.F)
                      ?.map((t) => t.teamNumber),
                    [SubEventTypeEnum.MX]: teams
                      ?.filter((t) => t.type == SubEventTypeEnum.MX)
                      ?.map((t) => t.teamNumber),
                    [SubEventTypeEnum.NATIONAL]: teams
                      ?.filter((t) => t.type == SubEventTypeEnum.NATIONAL)
                      ?.map((t) => t.teamNumber),
                  },
                },

                width: '100%',
                maxWidth: '600px',
              })
              .afterClosed();
          })
        )
      )
      .subscribe(() => {
        this.update$.next();
      });
  }

  deletePlayer(player: Player) {
    this.apollo.mutate({
      mutation: gql`
        mutation RemovePlayerFromClub($removePlayerFromClubId: ID!) {
          removePlayerFromClub(id: $removePlayerFromClubId)
        }
      `,
      variables: {
        removePlayerFromClubId: player.id,
      },
    });
  }

  async downloadTwizzit() {
    const season = this.filter.get('season')?.value;
    await lastValueFrom(this.twizzitService.downloadTwizzit(this.club, season));
  }

  addPlayer() {
    this.dialog
      .open(AddPlayerComponent, {
        data: {
          clubId: this.club.id,
        },
      })
      .afterClosed()
      .pipe(
        takeUntil(this.destroy$),
        filter((player) => !!player),
        switchMap((player) => {
          return this.apollo.mutate<{ addPlayerToClub: boolean }>({
            mutation: gql`
              mutation AddPlayerToClub($data: ClubPlayerMembershipNewInput!) {
                addPlayerToClub(data: $data)
              }
            `,
            variables: {
              data: {
                clubId: this.club.id,
                playerId: player.id,
                start: new Date(),
              },
            },
          });
        })
      )
      .subscribe(() => {
        this.update$.next();
      });
  }
}
