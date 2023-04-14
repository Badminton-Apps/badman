import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { TransferState } from '@angular/platform-browser';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  GameScoreComponentComponent,
  HasClaimComponent,
  PageHeaderComponent,
} from '@badman/frontend-components';
import {
  EncounterCompetition,
  Game,
  GamePlayer,
} from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { gameLabel, GameType } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo } from 'apollo-angular';
import { BreadcrumbService } from 'xng-breadcrumb';

@Component({
  templateUrl: './detail-encounter.page.html',
  styleUrls: ['./detail-encounter.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    // common modules
    CommonModule,
    RouterModule,

    // Other modules
    TranslateModule,

    // Material Modules
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatMenuModule,

    // Own components
    GameScoreComponentComponent,
    PageHeaderComponent,
    HasClaimComponent,
  ],
})
export class DetailEncounterComponent implements OnInit {
  encounterCompetition!: EncounterCompetition;
  encounterCompetitionName!: string;

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
      this.encounterCompetition = data['encounterCompetition'];
      this.encounterCompetitionName = `${this.encounterCompetition.home?.name} vs ${this.encounterCompetition.away?.name}`;
      const eventCompetitionName = data['eventCompetition']?.name;
      const drawCompetitionName = data['drawCompetition']?.name;

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
      this.breadcrumbsService.set('@eventCompetition', eventCompetitionName);
      this.breadcrumbsService.set('@drawCompetition', drawCompetitionName);
      this.breadcrumbsService.set(
        '@encounterCompetition',
        this.encounterCompetitionName
      );
    });
  }

  getGameLabel(game: number) {
    const gameType = this.encounterCompetition.drawCompetition
      ?.subEventCompetition?.eventType as 'M' | 'F' | 'MX';

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
}
