import { Component, Input, OnInit } from '@angular/core';
import { DrawTournament, EncounterCompetition } from '@badman/frontend/models';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'badman-game-history-title',
  templateUrl: './game-history-title.component.html',
  styleUrls: ['./game-history-title.component.scss'],
})
export class GameHistoryTitleComponent implements OnInit {
  @Input()
  linkId?: string;

  @Input()
  linkType?: string;

  @Input()
  playedAt?: Date;

  competition$?: Observable<EncounterCompetition>;
  tournament$?: Observable<DrawTournament>;

  constructor(private apollo: Apollo) {}

  ngOnInit(): void {
    switch (this.linkType) {
      case 'competition':
        this.competition$ = this.getCompetition();
        break;
      case 'tournament':
        this.tournament$ = this.getTournament();
        break;
    }
  }

  private getCompetition() {
    return this.apollo
      .query<{ encounterCompetition: Partial<EncounterCompetition> }>({
        query: gql`
          query Competition($linkId: ID!) {
            encounterCompetition(id: $linkId) {
              id
              home {
                name
                id
              }
              away {
                name
                id
              }
              homeScore
              awayScore
              date
              drawCompetition {
                name
                subEventCompetition {
                  name
                  id
                  eventCompetition {
                    id
                    name
                    slug
                  }
                }
                id
              }
            }
          }
        `,
        variables: {
          linkId: this.linkId,
        },
      })
      .pipe(
        map(
          (result) => new EncounterCompetition(result.data.encounterCompetition)
        )
      );
  }

  private getTournament() {
    return this.apollo
      .query<{ drawTournament: Partial<DrawTournament> }>({
        query: gql`
          query Tournament($linkId: ID!) {
            drawTournament(id: $linkId) {
              id
              name
              subEventTournament {
                name
                id
                level
                gameType
                eventType
                eventTournament {
                  id
                  slug
                  name
                }
              }
            }
          }
        `,
        variables: {
          linkId: this.linkId,
        },
      })
      .pipe(map((result) => new DrawTournament(result.data.drawTournament)));
  }
}
