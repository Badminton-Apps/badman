import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  effect,
  inject,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import {
  GameScoreComponentComponent,
  HasClaimComponent,
  PageHeaderComponent,
} from '@badman/frontend-components';
import {
  DrawCompetition,
  EncounterCompetition,
  EventCompetition,
  Game,
  GamePlayer,
} from '@badman/frontend-models';
import { JobsService } from '@badman/frontend-queue';
import { SeoService } from '@badman/frontend-seo';
import { GameType, gameLabel } from '@badman/utils';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { MomentModule } from 'ngx-moment';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { injectRouteData } from 'ngxtension/inject-route-data';
import { lastValueFrom, take } from 'rxjs';
import { BreadcrumbService } from 'xng-breadcrumb';

@Component({
    selector: 'badman-detail-encounter',
    templateUrl: './detail-encounter.page.html',
    styleUrls: ['./detail-encounter.page.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
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
        MomentModule,
    ]
})
export class DetailEncounterComponent {
  private seoService = inject(SeoService);
  private translateService = inject(TranslateService);
  private readonly apollo = inject(Apollo);
  private breadcrumbsService = inject(BreadcrumbService);
  private jobService = inject(JobsService);
  private platformId = inject<string>(PLATFORM_ID);

  encounterCompetition = injectRouteData<EncounterCompetition>('encounterCompetition');
  drawCompetition = injectRouteData<DrawCompetition>('drawCompetition');
  eventCompetition = injectRouteData<EventCompetition>('eventCompetition');

  destroy$ = injectDestroy();

  encounterCompetitionName = computed(() => {
    return `${this.encounterCompetition()?.home?.name} vs ${this.encounterCompetition()?.away?.name}`;
  });

  get isClient(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  constructor() {
    effect(() => {
      this.seoService.update({
        title: this.encounterCompetitionName(),
        description: `Encounter ${this.encounterCompetitionName()}`,
        type: 'website',
        keywords: [
          'encounter',
          'competition',
          'badminton',
          this.encounterCompetition()?.home?.name ?? '',
          this.encounterCompetition()?.away?.name ?? '',
        ],
      });
      this.breadcrumbsService.set('@eventCompetition', this.eventCompetition()?.name ?? '');
      this.breadcrumbsService.set('@drawCompetition', this.drawCompetition()?.name ?? '');
      this.breadcrumbsService.set('@encounterCompetition', this.encounterCompetitionName());
    });
  }

  getGameLabel(game: number) {
    const gameType = this.encounterCompetition()?.drawCompetition?.subEventCompetition?.eventType;

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
    const id = this.encounterCompetition()?.id;
    if (!id) {
      return;
    }

    await lastValueFrom(
      this.jobService.checkNotifications({
        id: id,
      }),
    );
  }

  reCalculatePoints() {
    this.apollo
      .mutate({
        mutation: gql`
          mutation RecalculateEncounterCompetitionRankingPoints($encounterId: ID!) {
            recalculateEncounterCompetitionRankingPoints(encounterId: $encounterId)
          }
        `,
        variables: {
          encounterId: this.encounterCompetition()?.id,
        },
      })
      .pipe(take(1))
      .subscribe();
  }
}
