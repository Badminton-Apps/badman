import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { SeoService } from '@badman/frontend-seo';
import { Apollo, gql } from 'apollo-angular';

import { HttpClient } from '@angular/common/http';
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
import { transferState } from '@badman/frontend-utils';
import { getCurrentSeason } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { saveAs } from 'file-saver';
import { MomentModule } from 'ngx-moment';
import { Observable, Subject, combineLatest, lastValueFrom } from 'rxjs';
import {
  map,
  startWith,
  switchMap,
  takeUntil
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
    private httpClient: HttpClient,
    @Inject(PLATFORM_ID) private platformId: string
  ) {}

  get isClient(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.filter = this.formBuilder.group({
      choices: [['M', 'F', 'MX']],
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
        this.filter.valueChanges,
        this.update$,
      ]).pipe(startWith([this.filter.value]), takeUntil(this.destroy$));

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
          map((result) => {
            if (!result.data.teams) {
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
              type
              entry {
                id
                date
                competitionSubEvent {
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
        transferState(`clubTeamsKey-${this.club.id}`),
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
        transferState(`clubPlayerTeamsKey-${this.club.id}`),
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
    import('@badman/frontend-team').then((m) => {
      this.dialog
        .open(m.EditDialogComponent, {
          data: {
            teamId: team.id,
          },

          width: '100%',
          maxWidth: '600px',
        })
        .afterClosed()
        .subscribe(() => {
          this.update$.next();
        });
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

  downloadTwizzit(club: Club) {
    const season = this.filter.get('season')?.toString();
    this.httpClient
      .get(`/api/twizzit/games`, {
        params: {
          clubId: club.id ?? '',
          year: `${season}`,
        },
        responseType: 'blob',
      })
      .subscribe((result) => {
        saveAs(result, `twizzit-${club.slug}-${season}.xlsx`);
      });
  }

  addPlayer() {
    this.dialog.open(AddPlayerComponent, {
      data: {
        clubId: this.club.id,
      },
    });
  }
}
