import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  Inject,
  Injector,
  OnInit,
  PLATFORM_ID,
  Signal,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SeoService } from '@badman/frontend-seo';
import { Apollo, gql } from 'apollo-angular';

import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { ClaimService } from '@badman/frontend-auth';
import {
  AddPlayerComponent,
  HasClaimComponent,
  LoadingBlockComponent,
  PageHeaderComponent,
  RecentGamesComponent,
  SelectSeasonComponent,
  UpcomingGamesComponent,
} from '@badman/frontend-components';
import { VERSION_INFO } from '@badman/frontend-html-injects';
import { Club, EventCompetition, Player } from '@badman/frontend-models';
import { TwizzitService } from '@badman/frontend-twizzit';
import { getCurrentSeason } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { MomentModule } from 'ngx-moment';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { Subject, lastValueFrom, of } from 'rxjs';
import { filter, startWith, switchMap, takeUntil } from 'rxjs/operators';
import { BreadcrumbService } from 'xng-breadcrumb';
import { ClubAssemblyComponent } from './club-assembly/club-assembly.component';
import { ClubCompetitionComponent } from './club-competition/club-competition.component';
import { ClubEncountersComponent } from './club-encounters/club-encounters.component';
import { ClubPlayersComponent } from './club-players/club-players.component';
import { ClubTeamsComponent } from './club-teams/club-teams.component';

@Component({
  selector: 'badman-club-detail',
  templateUrl: './detail.page.html',
  styleUrls: ['./detail.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MomentModule,
    TranslateModule,
    UpcomingGamesComponent,
    RecentGamesComponent,
    PageHeaderComponent,
    HasClaimComponent,
    LoadingBlockComponent,
    SelectSeasonComponent,
    ClubPlayersComponent,
    ClubTeamsComponent,
    ClubCompetitionComponent,
    ClubAssemblyComponent,
    ClubEncountersComponent,
    MatButtonToggleModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    MatDialogModule,
    MatSelectModule,
    MatProgressBarModule,
    MatTabsModule
],
})
export class DetailPageComponent implements OnInit {
  // Injectors
  private authService = inject(ClaimService);
  private injector = inject(Injector);
  private claimService = inject(ClaimService);
  private versionInfo: {
    beta: boolean;
    version: string;
  } = inject(VERSION_INFO);
  private destroy$ = injectDestroy();

  // signals
  seasons?: Signal<number[]>;
  canViewEnrollmentForClub?: Signal<boolean | undefined>;
  canViewEnrollmentForEvent?: Signal<boolean | undefined>;
  canViewEnrollments?: Signal<boolean | undefined>;

  // route
  private queryParams = toSignal(this.route.queryParamMap);
  private routeParams = toSignal(this.route.paramMap);
  private routeData = toSignal(this.route.data);

  club = computed(() => this.routeData()?.['club'] as Club);
  clubId = computed(() => this.club()?.id) as Signal<string>;
  currentTab = signal(this.queryParams()?.get('tab') ?? 0);

  filter!: FormGroup;

  update$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private seoService: SeoService,
    private breadcrumbsService: BreadcrumbService,
    private apollo: Apollo,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private twizzitService: TwizzitService,
    @Inject(PLATFORM_ID) private platformId: string,
  ) {
    const clubName = `${this.club().name}`;
    this.seoService.update({
      title: clubName,
      description: `Club ${clubName}`,
      type: 'website',
      keywords: ['club', 'badminton'],
    });
    this.breadcrumbsService.set('@club', clubName);
  }

  get isClient(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  hasPermission = toSignal(this.claimService.hasAnyClaims$(['edit-any:club']));

  canViewEncounter = computed(
    () => this.hasPermission() || this.versionInfo.beta,
  );

  ngOnInit(): void {
    this.filter = this.formBuilder.group({
      choices: [['M', 'F', 'MX', 'NATIONAL']],
      season: getCurrentSeason(),
      club: this.club(),
    });

    this.canViewEnrollmentForClub = toSignal(
      this.authService.hasAnyClaims$([
        'view-any:enrollment-competition',
        `${this.club().id}_view:enrollment-competition`,
      ]),
      { injector: this.injector },
    );

    this.canViewEnrollmentForEvent = toSignal(
      this.filter.get('season')?.valueChanges.pipe(
        startWith(this.filter.get('season')?.value),
        switchMap((season) => {
          return this.apollo.query<{
            eventCompetitions: {
              rows: Partial<EventCompetition>[];
            };
          }>({
            query: gql`
              query CompetitionIdsForSeason($where: JSONObject) {
                eventCompetitions(where: $where) {
                  rows {
                    id
                  }
                }
              }
            `,
            variables: {
              where: {
                season: season,
              },
            },
          });
        }),
        switchMap((result) => {
          if (!result?.data.eventCompetitions) {
            throw new Error('No eventCompetitions');
          }
          return this.authService.hasAnyClaims$(
            result.data.eventCompetitions.rows.map(
              (row) => `${row.id}_view:enrollment-competition`,
            ),
          );
        }),
      ) ?? of(false),
      { injector: this.injector },
    );

    this.canViewEnrollments = computed(
      () =>
        this.canViewEnrollmentForClub?.() || this.canViewEnrollmentForEvent?.(),
    );
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
    await lastValueFrom(
      this.twizzitService.downloadTwizzit(this.club(), season),
    );
  }

  addPlayer() {
    this.dialog
      .open(AddPlayerComponent, {
        data: {
          clubId: this.club().id,
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
                clubId: this.club().id,
                playerId: player.id,
                start: new Date(),
              },
            },
          });
        }),
      )
      .subscribe(() => {
        this.update$.next();
      });
  }
}
