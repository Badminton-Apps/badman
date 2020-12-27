import {
  Component,
  DoCheck,
  Input
} from '@angular/core';
import { Game, GameType, Player, SubEvent } from '../../../../../../../_shared';

@Component({
  selector: 'app-games-result',
  templateUrl: './games-result.component.html',
  styleUrls: ['./games-result.component.scss'],
})
export class GamesResultComponent implements DoCheck {
  @Input()
  games: Game[];

  gamesLength = -1;

  subEvent: SubEvent;
  gameType: GameType;

  subEvents;

  @Input()
  player: Player;

  ngDoCheck() {
    // This every time the games length changes
    if (this.games.length !== this.gamesLength) {
      // Shouldn't happen, but still :)
      if (this.games.length > 0) {
        this.subEvents = Object.values(
          this.games.reduce((rv, x) => {
            (rv[x.subEvent.id] = rv[x.subEvent.id] || {
              ...x.subEvent,
              games: [],
            }).games.push(x);
            return rv;
          }, {})
        );

        // This is only once
        if (this.gamesLength === -1) {
          this.subEvent = this.games[0].subEvent;

          this.subEvents.map((x) => {
            x.gameType = GameType[x.games[0].gameType];
          });
        }

        this.gamesLength = this.games.length;
      }
    }
  }
}
