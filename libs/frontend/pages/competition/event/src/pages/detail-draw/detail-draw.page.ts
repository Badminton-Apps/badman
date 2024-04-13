import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  computed,
  effect,
  inject
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  PageHeaderComponent,
  RecentGamesComponent,
  StandingComponent,
  UpcomingGamesComponent,
} from '@badman/frontend-components';
import { DrawCompetition, EventCompetition, Team } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BreadcrumbService } from 'xng-breadcrumb';
import { DrawLocationMapComponent } from './components';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { takeUntil } from 'rxjs/operators';

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
    StandingComponent,
    RecentGamesComponent,
    UpcomingGamesComponent,
    PageHeaderComponent,
    DrawLocationMapComponent,
  ],
})
export class DetailDrawCompetitionComponent {
  private readonly destroy$ = injectDestroy();
  private readonly translateService = inject(TranslateService);
 
  private readonly route = inject(ActivatedRoute);
  // private readonly router = inject(Router);
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly seoService = inject(SeoService);
  private readonly injector = inject(Injector);

  private routeData = toSignal(this.route.data);

  drawCompetition = computed(() => this.routeData()?.['drawCompetition'] as DrawCompetition);
  eventCompetition = computed(() => this.routeData()?.['eventCompetition'] as EventCompetition);
  teams = computed(() => this.drawCompetition()?.eventEntries?.map((e) => e.team as Team));

  constructor() {
    const compTitle = 'all.competition.title';

    this.translateService
      .get([compTitle])
      .pipe(takeUntil(this.destroy$))
      .subscribe((translations) => {
        this.breadcrumbService.set('competition', translations[compTitle]);
      });
    
    effect(
      () => {
        const drawCompetitionName = `${this.drawCompetition().name}`;
        this.seoService.update({
          title: drawCompetitionName,
          description: `Competition draw ${drawCompetitionName}`,
          type: 'website',
          keywords: ['event', 'competition', 'badminton'],
        });
        this.breadcrumbService.set('@eventCompetition', this.eventCompetition().name || '');
        this.breadcrumbService.set('@drawCompetition', drawCompetitionName);
      },
      {
        injector: this.injector,
      },
    );
  }
}
