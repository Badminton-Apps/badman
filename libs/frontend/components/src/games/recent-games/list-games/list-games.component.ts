import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { Game, GamePlayer } from '@badman/frontend-models';
import { GameBreakdownType, GameType, getGameResultType } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { MomentModule } from 'ngx-moment';
import { TrackByProp } from 'ngxtension/trackby-id-prop';
import { LoadingBlockComponent } from '../../../loading-block';
import { RecentGamesService } from './data-access/recent-games.service';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    MomentModule,
    ReactiveFormsModule,
    TrackByProp,

    // Material modules
    MatButtonModule,
    MatChipsModule,
    MatTooltipModule,
    MatButtonToggleModule,
    MatIconModule,

    // own modules
    LoadingBlockComponent,
  ],
  selector: 'badman-list-games',
  templateUrl: './list-games.component.html',
  styleUrls: ['./list-games.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListGamesComponent implements OnInit, AfterViewInit, OnChanges {
  recentGames = inject(RecentGamesService);

  @Input() playerId?: string;

  @ViewChild('bottomObserver', { static: false }) bottomObserver!: ElementRef;

  ngOnInit() {
    this.recentGames.filter.setValue({
      choices: ['S', 'D', 'MX'],
      playerId: this.playerId ?? '',
    });
  }

  ngAfterViewInit() {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 1.0,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && this.recentGames.games().length > 0) {
          // The bottom of the current list is visible, load more items
          this.recentGames.pagination$.next(
            this.recentGames.pagination$.getValue() + 1,
          );
        }
      });
    }, options);

    observer.observe(this.bottomObserver.nativeElement);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      !changes['playerId']?.currentValue ||
      !changes['playerId']?.previousValue
    ) {
      return;
    }

    // Reset the list when the playerId changes
    if (
      changes['playerId'].currentValue !== changes['playerId'].previousValue
    ) {
      console.log('resetting', changes['playerId'].currentValue);

      this.recentGames.filter.patchValue({
        choices: ['S', 'D', 'MX'],
        playerId: changes['playerId'].currentValue,
      });
    }
  }

  getPlayer(game: Game, player: number, team: number) {
    return game.players?.find((p) => p.player === player && p.team === team);
  }

  getRanking(game: Game, player: GamePlayer) {
    return player?.[this.getGameType(game.gameType ?? GameType.S)];
  }

  getWonStatusForPlayer(game: Game) {
    return (
      (game.winner == 1 && this.isTeamOfPlayer(game, 1)) ||
      (game.winner == 2 && this.isTeamOfPlayer(game, 2))
    );
  }

  isTeamOfPlayer(game: Game, team: number) {
    return game.players
      ?.filter((p) => p.team == team)
      ?.map((p) => p.id)
      ?.includes(this.playerId);
  }

  getPoints(game: Game, team: number) {
    let t1 = this.getPlayer(game, 1, team);
    if (!t1) {
      t1 = this.getPlayer(game, 2, team);
    }
    const won = game.winner == team;

    if (!game.gameType) {
      throw `Game ${game.id} has no gameType`;
    }

    let tooltip = undefined;

    const rankingPoint = game.rankingPoints?.find((p) => p.playerId === t1?.id);
    const result = getGameResultType(won, game.gameType, rankingPoint);

    switch (result) {
      case GameBreakdownType.WON:
        tooltip = 'all.breakdown.usedForDowngrade';
        break;
      case GameBreakdownType.LOST_DOWNGRADE:
        tooltip = 'all.breakdown.usedForDowngrade';
        break;
      case GameBreakdownType.LOST_UPGRADE:
        tooltip = 'all.breakdown.usedForUpgrade';
        break;
      case GameBreakdownType.LOST_IGNORED:
        tooltip = 'all.breakdown.notUsed';
        break;
    }

    // return the highest points
    return {
      points: rankingPoint?.points,
      tooltip,
      upgrade: result === GameBreakdownType.LOST_UPGRADE,
      downgrade: result === GameBreakdownType.LOST_DOWNGRADE,
      show:
        result !== GameBreakdownType.LOST_IGNORED &&
        (rankingPoint?.points ?? -1) >= 0,
    };
  }

  getExtra(game: Game) {
    let title = '';
    let link: string[] = [];

    if (game.competition) {
      title += game.competition.drawCompetition?.name;
      if (game.competition.home?.name && game.competition.away?.name) {
        title += ` • ${game.competition.home?.name} vs ${game.competition.away?.name}`;
      }
      link = [
        '/competition',
        game.competition.drawCompetition?.subEventCompetition?.eventId ?? '',
        'draw',
        game.competition.drawCompetition?.id ?? '',
        'encounter',
        game.competition.id ?? '',
      ];
    } else if (game.tournament) {
      title += game.tournament?.subEventTournament?.eventTournament?.name;
      title += ` `;
      title += game.tournament?.name;
      link = [
        '/tournament',
        game.tournament?.subEventTournament?.eventTournament?.id ?? '',
        'draw',
        game.tournament?.id ?? '',
      ];
    }

    return {
      title,
      link,
    };
  }

  private getGameType(type: GameType) {
    switch (type) {
      case GameType.S:
        return 'single';
      case GameType.D:
        return 'double';
      case GameType.MX:
        return 'mix';
    }
  }
}
