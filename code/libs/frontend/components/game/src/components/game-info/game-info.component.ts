import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { Game, PlayerGame } from '@badman/frontend-models';

@Component({
  selector: 'badman-game-info',
  templateUrl: './game-info.component.html',
  styleUrls: ['./game-info.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameInfoComponent implements OnInit {
  @Input() game!: Game;

  playerT1P1?: PlayerGame;
  playerT1P2?: PlayerGame;

  playerT2P1?: PlayerGame;
  playerT2P2?: PlayerGame;

  ngOnInit(): void {
    this.playerT1P1 = this.game.players?.find(
      (p) => p.team === 1 && p.player === 1
    );
    this.playerT1P2 = this.game.players?.find(
      (p) => p.team === 1 && p.player === 2
    );

    this.playerT2P1 = this.game.players?.find(
      (p) => p.team === 2 && p.player === 1
    );
    this.playerT2P2 = this.game.players?.find(
      (p) => p.team === 2 && p.player === 2
    );
  }

  getRanking(player: PlayerGame) {
    if (player && this.game.gameType) {
      if (player[this.game.gameType]) {
        return player[this.game.gameType];
      }
    }
    return 12;
  }
}
