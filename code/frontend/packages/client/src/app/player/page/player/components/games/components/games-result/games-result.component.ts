import { Component, Input, OnInit } from '@angular/core';
import {
  CompetitionSubEvent,
  Game,
  GameType,
  Player,
  TournamentSubEvent,
  CompetitionEncounter,
  TournamentDraw,
} from '../../../../../../../_shared';

@Component({
  selector: 'app-games-result',
  templateUrl: './games-result.component.html',
  styleUrls: ['./games-result.component.scss'],
})
export class GamesResultComponent implements OnInit {
  @Input()
  games!: Game[];

  gamesLength = -1;

  tournament!: TournamentDraw;
  competition!: CompetitionEncounter;

  gameType!: GameType;

  subEvents!: (CompetitionSubEvent | TournamentSubEvent)[];

  @Input()
  player!: Player;

  ngOnInit() {
    // This every time the games length changes
    if (this.games.length !== this.gamesLength) {
      // Shouldn't happen, but still :)
      if (this.games.length > 0) {
        this.subEvents = Object.values(
          this.games.reduce((acc: { [key: string]: CompetitionSubEvent | TournamentSubEvent }, cur) => {
            if (cur.competition?.draw?.subEvent) {
              (acc[cur.competition.draw.subEvent.id!] = acc[cur.competition.draw.subEvent.id!] || {
                ...cur.competition.draw.subEvent,
                games: [],
              }).games!.push(cur);
            }
            if (cur.tournament?.subEvent) {
              (acc[cur.tournament.subEvent.id!] = acc[cur.tournament.subEvent.id!] || {
                ...cur.tournament.subEvent,
                games: [],
              }).games!.push(cur);
            }

            return acc;
          }, {})
        );

        // This is only once
        if (this.gamesLength === -1) {
          if (this.games[0].competition) {
            this.competition = this.games[0]!.competition as CompetitionEncounter;
          }

          if (this.games[0].tournament) {
            this.tournament = this.games[0]!.tournament as TournamentDraw;
          }

          this.subEvents.map((x) => {
            x.gameType = x.games![0]!.gameType;
          });
        }

        this.gamesLength = this.games.length;
      }
    }
  }
}
