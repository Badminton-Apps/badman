import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { Game, Player } from '../../../../_shared';;

@Component({
  selector: 'badman-game-info',
  templateUrl: './game-info.component.html',
  styleUrls: ['./game-info.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameInfoComponent implements OnInit {
  @Input() game!: Game;

  playerT1P1?: Player;
  playerT1P2?: Player;

  playerT2P1?: Player;
  playerT2P2?: Player;


  ngOnInit(): void {
    this.playerT1P1 = this.game.players?.find(p => p.team === 1 && p.player === 1);
    this.playerT1P2 = this.game.players?.find(p => p.team === 1 && p.player === 2);

    this.playerT2P1 = this.game.players?.find(p => p.team === 2 && p.player === 1);
    this.playerT2P2 = this.game.players?.find(p => p.team === 2 && p.player === 2);
  }
}
