import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { GameType, PlayerGame, RankingPoint } from '../../../../../_shared';

@Component({
  selector: 'app-player-info',
  templateUrl: './player-info.component.html',
  styleUrls: ['./player-info.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerInfoComponent implements OnInit {
  @Input()
  player: PlayerGame;

  @Input()
  type: string;

  @Input()
  rankingPoint: RankingPoint;

  ranking: number;
  isUsedForUpgrade: boolean;
  isUsedForDowngrade: boolean;

  ngOnInit() {
    if (this.player) {
      if (this.player.rankingPlace) {
        this.ranking = this.player.rankingPlace[GameType[this.type]];
      }
    }

    if (this.rankingPoint) {
      let hasWon: boolean = this.rankingPoint.points > 0;
      this.isUsedForUpgrade =
        hasWon &&
        this.rankingPoint.differenceInLevel <=
          this.rankingPoint.type.differenceForUpgrade;
          
      this.isUsedForDowngrade =
        !hasWon &&
        this.rankingPoint.differenceInLevel >=
          this.rankingPoint.type.differenceForDowngrade;
    } else {
      this.isUsedForUpgrade = false;
      this.isUsedForDowngrade = false;
    }
  }
}
