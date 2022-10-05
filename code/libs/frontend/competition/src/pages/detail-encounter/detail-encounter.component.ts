import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { combineLatest, map, Observable, switchMap, tap } from 'rxjs';
import { EncounterCompetition } from '@badman/frontend/models';
import { SystemService } from '@badman/frontend/ranking';

@Component({
  templateUrl: './detail-encounter.component.html',
  styleUrls: ['./detail-encounter.component.scss'],
})
export class DetailEncounterComponent implements OnInit {
  encounter$!: Observable<EncounterCompetition>;

  constructor(
    private apollo: Apollo,
    private route: ActivatedRoute,
    private titleService: Title,
    private systemService: SystemService
  ) {}

  ngOnInit(): void {
    this.encounter$ = combineLatest([
      this.route.paramMap,
      this.systemService.getPrimarySystemId(),
    ]).pipe(
      switchMap(([q, system]) => {
        if (!system) {
          throw new Error('No system');
        }
        return this.apollo
          .query<{ encounterCompetition: EncounterCompetition }>({
            query: gql`
              query GetEncounter($id: ID!, $system: ID!) {
                encounterCompetition(id: $id) {
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
                      rankingPlace(where: { systemId: $system }) {
                        id
                        single
                        double
                        mix
                        rankingDate
                      }
                    }
                  }
                }
              }
            `,
            variables: {
              id: q.get('encounterId'),
              system,
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
