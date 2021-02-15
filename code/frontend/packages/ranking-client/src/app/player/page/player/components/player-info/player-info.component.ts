import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import { GameType, PlayerGame } from '../../../../../_shared';

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

  ranking: number;

  ngOnInit() {
    if (this.player) {
      if (this.player.rankingPlace) {
        this.ranking = this.player.rankingPlace[GameType[this.type]];
      }
    }
  }
}
