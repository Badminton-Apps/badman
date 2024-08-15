import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import {
  HasClaimComponent,
  PageHeaderComponent,
  RecentGamesComponent,
  StandingComponent,
  UpcomingGamesComponent,
} from '@badman/frontend-components';
import { DrawCompetition, EventCompetition, Team } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { injectRouteData } from 'ngxtension/inject-route-data';
import { take, takeUntil } from 'rxjs/operators';
import { BreadcrumbService } from 'xng-breadcrumb';
import { DrawLocationMapComponent } from './components';

@Component({
  selector: 'badman-detail-draw-competition',
  templateUrl: './detail-draw.page.html',
  styleUrls: ['./detail-draw.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    MatTooltipModule,
    MatIconModule,
    MatButtonModule,

    StandingComponent,
    RecentGamesComponent,
    UpcomingGamesComponent,
    PageHeaderComponent,
    DrawLocationMapComponent,
    HasClaimComponent,
    MatMenuModule,
  ],
})
export class DetailDrawCompetitionComponent {
  private readonly destroy$ = injectDestroy();
  private readonly translateService = inject(TranslateService);
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly seoService = inject(SeoService);
  private readonly apollo = inject(Apollo);

  drawCompetition = injectRouteData<DrawCompetition>('drawCompetition');
  eventCompetition = injectRouteData<EventCompetition>('eventCompetition');
  teams = computed(() => this.drawCompetition()?.eventEntries?.map((e) => e.team as Team));

  constructor() {
    const compTitle = 'all.competition.title';

    this.translateService
      .get([compTitle])
      .pipe(takeUntil(this.destroy$))
      .subscribe((translations) => {
        this.breadcrumbService.set('competitwion', translations[compTitle]);
      });

    effect(() => {
      const drawCompetitionName = `${this.drawCompetition()?.name}`;
      this.seoService.update({
        title: drawCompetitionName,
        description: `Competition draw ${drawCompetitionName}`,
        type: 'website',
        keywords: ['event', 'competition', 'badminton'],
      });
      this.breadcrumbService.set('@eventCompetition', this.eventCompetition()?.name ?? '');
      this.breadcrumbService.set('@drawCompetition', drawCompetitionName);
    });
  }

  reCalculatePoints() {
    this.apollo
      .mutate({
        mutation: gql`
          mutation RecalculateDrawCompetitionRankingPoints($drawId: ID!) {
            recalculateDrawCompetitionRankingPoints(drawId: $drawId)
          }
        `,
        variables: {
          drawId: this.drawCompetition()?.id,
        },
      })
      .pipe(take(1))
      .subscribe();
  }
}
