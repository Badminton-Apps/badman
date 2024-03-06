import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
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
export class DetailDrawComponent implements OnInit {
  drawTournament!: DrawTournament;
  eventTournament!: EventTournament;
  players?: Player[];
  constructor(
    private seoService: SeoService,
    private route: ActivatedRoute,
    private breadcrumbsService: BreadcrumbService,
    @Inject(PLATFORM_ID) private platformId: string,
  ) {}

  get isClient(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.drawTournament = data['drawTournament'];
      this.eventTournament = data['eventTournament'];

      const drawTournamentName = `${this.drawTournament.name}`;
      const eventTournamentName = `${this.eventTournament.name}`;

      this.seoService.update({
        title: drawTournamentName,
        description: `Draw ${drawTournamentName}`,
        type: 'website',
        keywords: ['event', 'tournament', 'badminton'],
      });
      this.breadcrumbsService.set('@eventTournament', eventTournamentName);
      this.breadcrumbsService.set('@drawTournament', drawTournamentName);

      this.players = this.drawTournament?.eventEntries
        ?.map((e) => {
          return e.players;
        })
        .flat()
        .filter((p) => p) as Player[];
    });
  }
}
