import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  effect,
  inject,
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
import { DrawTournament, EventTournament, Player } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { TranslateModule } from '@ngx-translate/core';
import { BreadcrumbService } from 'xng-breadcrumb';

@Component({
  selector: 'badman-detail-draw-tournament',
  templateUrl: './detail-draw.page.html',
  styleUrls: ['./detail-draw.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    MatIconModule,
    MatTooltipModule,
    StandingComponent,
    RecentGamesComponent,
    UpcomingGamesComponent,
    PageHeaderComponent,
  ],
})
export class DetailDrawComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly seoService = inject(SeoService);
  private readonly platformId = inject(PLATFORM_ID);

  private routeData = toSignal(this.route.data);

  drawTournament = computed(() => this.routeData()?.['drawTournament'] as DrawTournament);
  eventTournament = computed(() => this.routeData()?.['eventTournament'] as EventTournament);

  players = computed(
    () =>
      this.drawTournament()
        ?.eventEntries?.map((e) => {
          return e.players;
        })
        .flat()
        .filter((p) => p) as Player[],
  );

  get isClient(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  constructor() {
    effect(() => {
      const drawTournamentName = `${this.drawTournament().name}`;
      const eventTournamentName = `${this.eventTournament().name}`;

      this.seoService.update({
        title: drawTournamentName,
        description: `Draw ${drawTournamentName}`,
        type: 'website',
        keywords: ['event', 'tournament', 'badminton'],
      });
      this.breadcrumbService.set('@eventTournament', eventTournamentName);
      this.breadcrumbService.set('@drawTournament', drawTournamentName);
    });
  }
}
