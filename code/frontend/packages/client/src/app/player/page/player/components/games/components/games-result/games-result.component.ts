import { ChangeDetectorRef, Component, DoCheck, Input, OnInit } from '@angular/core';
import {
  CompetitionSubEvent,
  Game,
  GameType,
  Player,
  TournamentSubEvent,
} from '../../../../../../../_shared';

@Component({
  selector: 'app-games-result',
  templateUrl: './games-result.component.html',
  styleUrls: ['./games-result.component.scss'],
})
export class GamesResultComponent implements OnInit {
  @Input()
  games: Game[];

  gamesLength = -1;

  subEvent: CompetitionSubEvent | TournamentSubEvent;
  gameType: GameType;

  subEvents: (CompetitionSubEvent | TournamentSubEvent)[];

  @Input()
  player: Player;

  ngOnInit() {
    // This every time the games length changes
    if (this.games.length !== this.gamesLength) {
      // Shouldn't happen, but still :)
      if (this.games.length > 0) {
        this.subEvents = Object.values(
          this.games.reduce((acc, cur) => {
            if (cur.competition) {
              (acc[cur.competition.draw.subEvent.id] = acc[
                cur.competition.draw.subEvent.id
              ] || {
                ...cur.competition.draw.subEvent,
                games: [],
              }).games.push(cur);
            }
            if (cur.tournament) {
              (acc[cur.tournament.subEvent.id] = acc[
                cur.tournament.subEvent.id
              ] || {
                ...cur.tournament.subEvent,
                games: [],
              }).games.push(cur);
            }

            return acc;
          }, {})
        );

        // This is only once
        if (this.gamesLength === -1) {
          if (this.games[0].competition) {
            this.subEvent = this.games[0].competition.draw.subEvent;
          }

          if (this.games[0].tournament) {
            this.subEvent = this.games[0].tournament.subEvent;
          }

          this.subEvents.map((x) => {
            x.gameType = GameType[x.games[0].gameType];
          });
        }

        this.gamesLength = this.games.length;
      }
    }
  }
}
