import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { GameStatus, GameType, PlayerGame, RankingPoint } from '../../../../../_shared';

@Component({
  selector: 'app-player-info',
  templateUrl: './player-info.component.html',
  styleUrls: ['./player-info.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerInfoComponent implements OnInit {
  @Input()
  player!: PlayerGame;

  @Input()
  type?: GameType;

  @Input()
  won: boolean = false;

  @Input()
  status?: GameStatus;

  @Input()
  rankingPoint!: RankingPoint;

  ranking?: number;
  wonIsUsedForUpgrade!: boolean;
  lostIsUsedForUpgrade!: boolean;
  lostIsUsedForDowngrade!: boolean;

  class: string = 'not-used';
  tooltip: string = '';

  ngOnInit() {
    this.status = this.status || GameStatus.NORMAL;

    if (this.player) {
      if (this.player.rankingPlace && this.type) {
        this.ranking = this.player.rankingPlace[this.type];
      }
    }

    if (this.rankingPoint) {
      this.wonIsUsedForUpgrade = this.won;

      this.lostIsUsedForUpgrade =
        !this.won && this.rankingPoint.differenceInLevel! >= this.rankingPoint.type!.differenceForUpgrade! * -1;

      this.lostIsUsedForDowngrade =
        !this.won && this.rankingPoint.differenceInLevel! >= this.rankingPoint.type!.differenceForDowngrade! * -1;

      if (this.wonIsUsedForUpgrade) {
        this.tooltip = 'Used for upgrade and downgrade';
        this.class = 'won';
      } else if (this.lostIsUsedForDowngrade) {
        this.tooltip = 'Used for upgrade and downgrade';
        this.class = 'upgrade';
      } else if (this.lostIsUsedForUpgrade) {
        this.tooltip = 'Used only for upgrade';
        this.class = 'downgrade';
      } else {
        this.tooltip = 'Not used';
        this.class = 'not-used';
      }
    }
  }
}
