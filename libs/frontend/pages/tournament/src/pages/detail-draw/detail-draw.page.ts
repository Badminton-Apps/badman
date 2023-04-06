import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { TransferState } from '@angular/platform-browser';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  RecentGamesComponent,
  StandingComponent,
  UpcomingGamesComponent,
} from '@badman/frontend-components';
import { DrawTournament, Player, Team } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo } from 'apollo-angular';
import { BreadcrumbService } from 'xng-breadcrumb';

@Component({
  templateUrl: './detail-draw.page.html',
  styleUrls: ['./detail-draw.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    // Commmon module
    CommonModule,
    RouterModule,
    TranslateModule,

    // Own Modules
    StandingComponent,
    RecentGamesComponent,
    UpcomingGamesComponent,
  ],
})
export class DetailDrawComponent implements OnInit {
  drawTournament!: DrawTournament;
  players?: Player[];
  constructor(
    private seoService: SeoService,
    private route: ActivatedRoute,
    private breadcrumbsService: BreadcrumbService,
    private apollo: Apollo,
    private transferState: TransferState,
    @Inject(PLATFORM_ID) private platformId: string
  ) {}

  get isClient(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.drawTournament = data['drawTournament'];
      const drawTournamentName = `${this.drawTournament.name}`;

      const eventTournamentName = data['eventTournament']?.name;

      this.seoService.update({
        title: drawTournamentName,
        description: `Club ${drawTournamentName}`,
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
