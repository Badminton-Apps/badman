import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  TransferState,
  signal,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SeoService } from '@badman/frontend-seo';
import { Apollo, gql } from 'apollo-angular';

import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
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
import { Observable, Subject, lastValueFrom } from 'rxjs';
import { filter, map, switchMap, take, takeUntil } from 'rxjs/operators';
import { BreadcrumbService } from 'xng-breadcrumb';
import { ClubPlayersComponent } from './club-players/club-players.component';
import { ClubTeamsComponent } from './club-teams/club-teams.component';

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
    ClubPlayersComponent,
    ClubTeamsComponent,

    // Material Modules
    MatButtonToggleModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,

    MatDialogModule,
    MatSelectModule,
    MatProgressBarModule,
    MatTabsModule,
  ],
})
export class DetailPageComponent implements OnInit, OnDestroy {
  club!: Club;
  filter!: FormGroup;

  update$ = new Subject<void>();
  destroy$ = new Subject<void>();
  seasons = [getCurrentSeason()];

  currentTab = signal(0);

  constructor(
    private formBuilder: FormBuilder,
    private seoService: SeoService,
    private breadcrumbsService: BreadcrumbService,
    private apollo: Apollo,
    private route: ActivatedRoute,
    private router: Router,
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

      // check if the query params contian tabindex
      this.route.queryParams
        .pipe(
          take(1),
          filter((params) => params['tab']),
          map((params) => params['tab'])
        )
        .subscribe((tabindex) => {
          this.currentTab.set(parseInt(tabindex, 10));
        });

      this._getYears().then((years) => {
        if (years.length > 0) {
          this.seasons = years;
        }
      });
    });
  }

  setTab(index: number) {
    this.currentTab.set(index);
    this.router.navigate([], {
      queryParams: {
        tab: index === 0 ? undefined : index,
      },
      queryParamsHandling: 'merge',
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
