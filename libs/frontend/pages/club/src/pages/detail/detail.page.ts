import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  Inject,
  Injector,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  Signal,
  TransferState,
  computed,
  effect,
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
import { Club, EventCompetition, Player, Team } from '@badman/frontend-models';
import { TwizzitService } from '@badman/frontend-twizzit';
import { transferState } from '@badman/frontend-utils';
import { getCurrentSeason } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { MomentModule } from 'ngx-moment';
import { Subject, lastValueFrom, of } from 'rxjs';
import {
  filter,
  map,
  startWith,
  switchMap,
  take,
  takeUntil,
} from 'rxjs/operators';
import { BreadcrumbService } from 'xng-breadcrumb';
import { ClubCompetitionComponent } from './club-competition/club-competition.component';
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
    ClubCompetitionComponent,
    SelectSeasonComponent,

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
  // Injectors
  authService = inject(ClaimService);
  injector = inject(Injector);

  // signals
  seasons?: Signal<number[]>;
  currentTab = signal(0);
  canViewEnrollmentForClub?: Signal<boolean | undefined>;
  canViewEnrollmentForEvent?: Signal<boolean | undefined>;
  canViewEnrollments?: Signal<boolean | undefined>;

  club!: Club;
  filter!: FormGroup;

  update$ = new Subject<void>();
  destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private seoService: SeoService,
    private breadcrumbsService: BreadcrumbService,
    private apollo: Apollo,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private twizzitService: TwizzitService,
    @Inject(PLATFORM_ID) private platformId: string
  ) {}

  get isClient(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.club = data['club'];

      this.filter = this.formBuilder.group({
        choices: [['M', 'F', 'MX', 'NATIONAL']],
        season: getCurrentSeason(),
        club: this.club,
      });

      const clubName = `${this.club.name}`;

      this.seoService.update({
        title: clubName,
        description: `Club ${clubName}`,
        type: 'website',
        keywords: ['club', 'badminton'],
      });
      this.breadcrumbsService.set('@club', clubName);

      this.canViewEnrollmentForClub = toSignal(
        this.authService.hasAnyClaims$([
          'view-any:enrollment-competition',
          `${this.club.id}_view:enrollment-competition`,
        ]),
        { injector: this.injector }
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
                (row) => `${row.id}_view:enrollment-competition`
              )
            );
          })
        ) ?? of(false),
        { injector: this.injector }
      );

      this.canViewEnrollments = computed(
        () =>
          this.canViewEnrollmentForClub?.() ||
          this.canViewEnrollmentForEvent?.()
      );

      effect(
        () => {
          // if the canViewEnrollments is loaded
          if (this.canViewEnrollments?.() !== undefined) {
            // check if the query params contian tabindex
            this.route.queryParams
              .pipe(
                startWith(this.route.snapshot.queryParams),
                take(1),
                filter((params) => params['tab']),
                map((params) => params['tab'])
              )
              .subscribe((tabindex) => {
                this.currentTab.set(parseInt(tabindex, 10));
              });
          }
        },
        { injector: this.injector, allowSignalWrites: true }
      );
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
