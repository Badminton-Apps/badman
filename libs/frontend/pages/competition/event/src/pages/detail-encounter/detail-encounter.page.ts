import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  GameScoreComponentComponent,
  HasClaimComponent,
  PageHeaderComponent,
} from '@badman/frontend-components';
import { JobsService } from '@badman/frontend-queue';
import {
  DrawCompetition,
  EncounterCompetition,
  EventCompetition,
  Game,
  GamePlayer,
} from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { GameType, gameLabel } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { lastValueFrom } from 'rxjs';
import { BreadcrumbService } from 'xng-breadcrumb';
import { MomentModule } from 'ngx-moment';

@Component({
  selector: 'badman-detail-encounter',
  templateUrl: './detail-encounter.page.html',
  styleUrls: ['./detail-encounter.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule,
    GameScoreComponentComponent,
    PageHeaderComponent,
    HasClaimComponent,
    MomentModule
  ],
})
export class DetailEncounterComponent implements OnInit {
  private seoService = inject(SeoService);
  private route = inject(ActivatedRoute);
  private breadcrumbsService = inject(BreadcrumbService);
  private jobService = inject(JobsService);
  private platformId = inject<string>(PLATFORM_ID);
  encounterCompetition!: EncounterCompetition;
  drawCompetition!: DrawCompetition;
  eventCompetition!: EventCompetition;
  encounterCompetitionName!: string;

  get isClient(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.encounterCompetition = data['encounterCompetition'];
      this.encounterCompetitionName = `${this.encounterCompetition.home?.name} vs ${this.encounterCompetition.away?.name}`;
      this.eventCompetition = data['eventCompetition'];
      this.drawCompetition = data['drawCompetition'];

      this.seoService.update({
        title: this.encounterCompetitionName,
        description: `Encounter ${this.encounterCompetitionName}`,
        type: 'website',
        keywords: [
          'encounter',
          'competition',
          'badminton',
          this.encounterCompetition.home?.name ?? '',
          this.encounterCompetition.away?.name ?? '',
        ],
      });
      this.breadcrumbsService.set('@eventCompetition', this.eventCompetition.name ?? '');
      this.breadcrumbsService.set('@drawCompetition', this.drawCompetition.name ?? '');
      this.breadcrumbsService.set('@encounterCompetition', this.encounterCompetitionName);
    });
  }

  getGameLabel(game: number) {
    const gameType = this.encounterCompetition.drawCompetition?.subEventCompetition?.eventType as
      | 'M'
      | 'F'
      | 'MX';

    if (!gameType) {
      return [];
    }

    return gameLabel(gameType, game + 1) as string[];
  }

  getPlayer(game: Game, player: number, team: number) {
    return game.players?.find((p) => p.player === player && p.team === team);
  }

  getRanking(player: GamePlayer, game: Game) {
    if (!game.gameType) return null;
    switch (game.gameType) {
      case GameType.S:
        return player.single;
      case GameType.D:
        return player.double;
      case GameType.MX:
        return player.mix;
    }
  }

  async syncNotifications() {
    if (!this.encounterCompetition.id) {
      return;
    }

    await lastValueFrom(
      this.jobService.checkNotifications({
        id: this.encounterCompetition.id,
      }),
    );
  }
}
