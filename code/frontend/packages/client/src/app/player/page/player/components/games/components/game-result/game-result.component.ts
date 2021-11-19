import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { Game, Player, RankingPoint } from 'app/_shared';

@Component({
  selector: 'app-game-result',
  templateUrl: './game-result.component.html',
  styleUrls: ['./game-result.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameResultComponent implements OnInit {
  @Input()
  game!: Game;

  @Input()
  player!: Player;

  player1Team1!: Player;
  player2Team1!: Player;
  player1Team2!: Player;
  player2Team2!: Player;

  rankingPointP1T1!: RankingPoint;
  rankingPointP2T1!: RankingPoint;
  rankingPointP1T2!: RankingPoint;
  rankingPointP2T2!: RankingPoint;

  getPlayer(player: number, team: number) {
    return this.game.players!.find((x) => x.team === team && x.player === player);
  }

  getRankingPoint(player: Player) {
    if (player) {
      return this.game.rankingPoints!.find((rankingPoint) => rankingPoint.player!.id === player.id);
    }
    return null;
  }

  constructor() {}

  ngOnInit(): void {
    this.player1Team1 = this.getPlayer(1, 1)!;
    this.player2Team1 = this.getPlayer(2, 1)!;
    this.player1Team2 = this.getPlayer(1, 2)!;
    this.player2Team2 = this.getPlayer(2, 2)!;

    this.rankingPointP1T1 = this.getRankingPoint(this.player1Team1)!;
    this.rankingPointP2T1 = this.getRankingPoint(this.player2Team1)!;
    this.rankingPointP1T2 = this.getRankingPoint(this.player1Team2)!;
    this.rankingPointP2T2 = this.getRankingPoint(this.player2Team2)!;
  }
}
