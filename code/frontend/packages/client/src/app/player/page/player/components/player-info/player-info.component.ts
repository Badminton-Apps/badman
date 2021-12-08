import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { GameType, PlayerGame, RankingPoint } from '../../../../../_shared';

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
  bye: boolean = false;

  @Input()
  rankingPoint!: RankingPoint;

  ranking?: number;
  isUsedForUpgrade!: boolean;
  isUsedForDowngrade!: boolean;

  tooltip: string = '';

  ngOnInit() {
    if (this.player) {
      if (this.player.rankingPlace && this.type) {
        this.ranking = this.player.rankingPlace[this.type];
      }
    }

    if (this.rankingPoint) {
      this.isUsedForUpgrade =
        this.won && this.rankingPoint.differenceInLevel! <= this.rankingPoint.type!.differenceForUpgrade!;
      this.isUsedForDowngrade =
        !this.won && this.rankingPoint.differenceInLevel! >= this.rankingPoint.type!.differenceForDowngrade!;

      if (this.isUsedForUpgrade) {
        this.tooltip = 'Used for upgrade and downgrade';
      } else if (this.isUsedForDowngrade) {
        this.tooltip = 'Used only for downgrade';
      } else {
        this.tooltip = 'Not used';
      }
    }
  }
}
