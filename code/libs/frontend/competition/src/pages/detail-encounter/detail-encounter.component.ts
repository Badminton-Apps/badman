import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { EncounterCompetition } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { map, Observable, switchMap, tap } from 'rxjs';

@Component({
  templateUrl: './detail-encounter.component.html',
  styleUrls: ['./detail-encounter.component.scss'],
})
export class DetailEncounterComponent implements OnInit {
  encounter$!: Observable<EncounterCompetition>;

  constructor(
    private apollo: Apollo,
    private route: ActivatedRoute,
    private titleService: Title
  ) {}

  ngOnInit(): void {
    this.encounter$ = this.route.paramMap.pipe(
      switchMap((q) => {
        return this.apollo
          .query<{ encounterCompetition: EncounterCompetition }>({
            query: gql`
              query GetEncounter($id: ID!) {
                encounterCompetition(id: $id) {
                  id
                  homeScore
                  awayScore
                  date
                  drawCompetition {
                    subEventCompetition {
                      eventType
                    }
                  }
                  home {
                    id
                    name
                  }
                  away {
                    id
                    name
                  }
                  games {
                    id
                    order
                    gameType
                    linkType
                    set1Team1
                    set1Team2
                    set2Team1
                    set2Team2
                    set3Team1
                    set3Team2
                    status
                    winner
                    playedAt
                    players {
                      id
                      slug
                      fullName
                      team
                      player
                      single
                      double
                      mix
                    }
                  }
                }
              }
            `,
            variables: {
              id: q.get('encounterId'),
            },
          })
          .pipe(
            map((result) => result.data.encounterCompetition),
            map((encounter) => new EncounterCompetition(encounter)),
            tap((encounter) =>
              this.titleService.setTitle(
                `${encounter.home?.name} vs ${encounter.away?.name} (${encounter.homeScore} - ${encounter.awayScore})`
              )
            )
          );
      })
    );
  }
}
