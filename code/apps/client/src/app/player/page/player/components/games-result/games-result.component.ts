import { Component, Input, OnInit } from '@angular/core';
import {
  CompetitionEncounter,
  CompetitionSubEvent,
  Game,
  GameType,
  Player,
  TournamentDraw,
  TournamentSubEvent,
} from '../../../../../_shared';

@Component({
  selector: 'badman-games-result',
  templateUrl: './games-result.component.html',
  styleUrls: ['./games-result.component.scss'],
})
export class GamesResultComponent implements OnInit {
  @Input()
  games!: Game[];

  gamesLength = -1;

  tournament!: TournamentDraw;
  competition!: CompetitionEncounter;

  @Input()
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
          this.games.reduce(
            (
              acc: { [key: string]: CompetitionSubEvent | TournamentSubEvent },
              cur
            ) => {
              let subEvent:
                | CompetitionSubEvent
                | TournamentSubEvent
                | undefined;

              if (cur.competition?.drawCompetition?.subEventCompetition) {
                subEvent = cur.competition.drawCompetition.subEventCompetition;
              } else if (cur.tournament?.subEventTournament) {
                subEvent = cur.tournament.subEventTournament;
              }

              if (!subEvent?.id) {
                throw new Error('No subEvent id');
              }

              let event = acc[subEvent.id];

              if (!event || !event.games) {
                event = subEvent;
                acc[subEvent.id] = event;
              }

              event.games = [...(event.games ?? []), cur];

              return acc;
            },
            {}
          )
        );

        // This is only once
        if (this.gamesLength === -1) {
          if (this.games[0].competition) {
            this.competition = this.games[0]
              .competition as CompetitionEncounter;
          }

          if (this.games[0].tournament) {
            this.tournament = this.games[0].tournament as TournamentDraw;
          }

          this.subEvents.map((x) => {
            if (x instanceof TournamentSubEvent) {
              x.gameType = this.gameType ?? (x.games ?? [])[0].gameType;
            }
          });
        }

        this.gamesLength = this.games.length;
      }
    }
  }
}
