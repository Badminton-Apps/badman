import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  PageHeaderComponent,
  RecentGamesComponent,
  StandingComponent,
  UpcomingGamesComponent,
} from '@badman/frontend-components';
import {
  DrawCompetition,
  EventCompetition,
  Team,
} from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { TranslateModule } from '@ngx-translate/core';
import { BreadcrumbService } from 'xng-breadcrumb';
import { DrawLocationMapComponent } from './components';

@Component({
  selector: 'badman-detail-draw-competition',
  templateUrl: './detail-draw.page.html',
  styleUrls: ['./detail-draw.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    // Commmon module
    CommonModule,
    RouterModule,
    TranslateModule,

    // Material
    MatTooltipModule,
    MatIconModule,

    // Own Modules
    StandingComponent,
    RecentGamesComponent,
    UpcomingGamesComponent,
    PageHeaderComponent,
    DrawLocationMapComponent
  ],
})
export class DetailDrawCompetitionComponent implements OnInit {
  drawCompetition!: DrawCompetition;
  eventCompetition!: EventCompetition;
  teams?: Team[];
  constructor(
    private seoService: SeoService,
    private route: ActivatedRoute,
    private breadcrumbsService: BreadcrumbService,
    @Inject(PLATFORM_ID) private platformId: string
  ) {}

  get isClient(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.drawCompetition = data['drawCompetition'];
      const drawCompetitionName = `${this.drawCompetition.name}`;

      this.eventCompetition = data['eventCompetition'];

      this.seoService.update({
        title: drawCompetitionName,
        description: `Club ${drawCompetitionName}`,
        type: 'website',
        keywords: ['event', 'competition', 'badminton'],
      });
      this.breadcrumbsService.set(
        '@eventCompetition',
        this.eventCompetition.name || ''
      );
      this.breadcrumbsService.set('@drawCompetition', drawCompetitionName);

      this.teams = this.drawCompetition?.eventEntries?.map((e) => {
        return e.team as Team;
      });
    });
  }
}
