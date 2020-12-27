import {
  ChangeDetectionStrategy, Component,

  Input, OnInit
} from '@angular/core';
import { Game, Player } from '../../../../../../../_shared';

@Component({
  selector: 'app-game-result',
  templateUrl: './game-result.component.html',
  styleUrls: ['./game-result.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameResultComponent implements OnInit {
  @Input()
  game: Game;

  @Input()
  player: Player;

  player1Team1: Player;
  player2Team1: Player;
  player1Team2: Player;
  player2Team2: Player;

  getPlayer(player: number, team: number) {
    return this.game.players.find(
      (x) => x.team === team && x.player === player
    );
  }

  constructor() { }

  ngOnInit(): void {
    this.player1Team1 = this.getPlayer(1, 1);
    this.player2Team1 = this.getPlayer(2, 1);
    this.player1Team2 = this.getPlayer(1, 2);
    this.player2Team2 = this.getPlayer(2, 2);
  }
}
