import { CommonModule } from '@angular/common';
import {
  Component,
  Injector,
  PLATFORM_ID,
  TransferState,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  HasClaimComponent,
  PageHeaderComponent,
  RecentGamesComponent,
  UpcomingGamesComponent,
} from '@badman/frontend-components';
import { EventEntry, Team } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { transferState } from '@badman/frontend-utils';
import { getCurrentSeason } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { map, takeUntil } from 'rxjs';
import { BreadcrumbService } from 'xng-breadcrumb';

@Component({
  templateUrl: './detail.page.html',
  styleUrls: ['./detail.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    RecentGamesComponent,
    UpcomingGamesComponent,
    PageHeaderComponent,
    HasClaimComponent,
  ],
})
export class DetailPageComponent {
  private route = inject(ActivatedRoute);
  private apollo = inject(Apollo);
  private stateTransfer = inject(TransferState);
  private platformId = inject(PLATFORM_ID);
  private breadcrumbService = inject(BreadcrumbService);
  private seoService = inject(SeoService);
  private injector = inject(Injector);
  private destroy$ = injectDestroy();

  // route
  private queryParams = toSignal(this.route.queryParamMap);
  private routeParams = toSignal(this.route.paramMap);
  private routeData = toSignal(this.route.data);

  team = computed(() => this.routeData()?.['team'] as Team);

  entry = signal<EventEntry | null>(null);

  constructor() {
    effect(() => {
      const teamName = `${this.team().name}`;
      const clubName = `${this.team().club?.name}`;

      this.seoService.update({
        title: teamName,
        description: `Team ${teamName}`,
        type: 'website',
        keywords: ['team', 'badminton'],
      });
      this.breadcrumbService.set('club/:id', clubName);
      this.breadcrumbService.set('club/:id/team/:id', teamName);

      this._loadEntry();
    });
  }

  private _loadEntry() {
    const year = getCurrentSeason();
    this.apollo
      .query<{ team: Partial<Team> }>({
        query: gql`
          query Entries($teamId: ID!) {
            team(id: $teamId) {
              id
              entry {
                id
                date
                standing {
                  id
                  position
                  size
                }
                drawCompetition {
                  id
                }
                subEventCompetition {
                  id
                  eventCompetition {
                    id
                    name
                    slug
                  }
                }
              }
            }
          }
        `,
        variables: {
          teamId: this.team().id,
        },
      })
      .pipe(
        takeUntil(this.destroy$),
        transferState(`teamEntries-${this.team().id}-${year}`, this.stateTransfer, this.platformId),
        map((result) => {
          if (!result?.data?.team?.entry) {
            return undefined;
          }

          return new EventEntry(result?.data?.team?.entry as Partial<EventEntry>);
        }),
      )
      .subscribe((entry) => {
        if (!entry) {
          return;
        }

        this.entry.set(entry);
      });
  }
}
