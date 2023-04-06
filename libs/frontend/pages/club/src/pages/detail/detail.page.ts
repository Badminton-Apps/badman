import {
  CommonModule,
  isPlatformBrowser,
  isPlatformServer,
} from '@angular/common';
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
import { MatSelectModule } from '@angular/material/select';
import { TransferState, makeStateKey } from '@angular/platform-browser';
import {
  HasClaimComponent,
  PageHeaderComponent,
  RecentGamesComponent,
  UpcomingGamesComponent,
} from '@badman/frontend-components';
import { Club, EncounterCompetition, Team } from '@badman/frontend-models';
import { getCurrentSeason } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { saveAs } from 'file-saver';
import { MomentModule } from 'ngx-moment';
import { Observable, Subject, combineLatest, lastValueFrom, of } from 'rxjs';
import {
  delay,
  map,
  startWith,
  switchMap,
  takeUntil,
  tap,
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

    // Material Modules
    MatButtonToggleModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    MatDialogModule,
    MatSelectModule,
  ],
})
export class DetailPageComponent implements OnInit, OnDestroy {
  club!: Club;
  filter!: FormGroup;

  update$ = new Subject<void>();
  destroy$ = new Subject<void>();
  teams$!: Observable<Team[]>;
  recentEncounters$!: Observable<EncounterCompetition[]>;
  upcomingEncounters$!: Observable<EncounterCompetition[]>;
  seasons = [getCurrentSeason()];
  loading = false;

  constructor(
    private formBuilder: FormBuilder,
    private seoService: SeoService,
    private breadcrumbsService: BreadcrumbService,
    private apollo: Apollo,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private transferState: TransferState,
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

      this.teams$ = combineLatest([
        this.filter.valueChanges,
        this.update$,
      ]).pipe(
        startWith([this.filter.value]),
        takeUntil(this.destroy$),
        tap(() => (this.loading = true)),
        delay(0), // delay to prevent flickering and to show loading indicator
        switchMap(([filter]) => this._loadTeams(filter)),
        tap(() => (this.loading = false))
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
    const STATE_KEY = makeStateKey<Team[]>('clubTeamsKey-' + this.club.id);

    if (this.transferState.hasKey(STATE_KEY)) {
      const state = this.transferState.get(STATE_KEY, []);
      return of(state?.map((team) => new Team(team)));
    } else {
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
          map((result) => {
            if (!result.data.teams) {
              throw new Error('No club');
            }
            return result.data.teams?.map((team) => new Team(team));
          }),
          tap((teams) => {
            if (isPlatformServer(this.platformId)) {
              this.transferState.set(STATE_KEY, teams);
            }
          })
        );
    }
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
}