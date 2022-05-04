import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { combineLatest, map, Observable, switchMap, tap } from 'rxjs';
import { CompetitionEncounter, SystemService } from '../../../_shared';

@Component({
  templateUrl: './detail-encounter.component.html',
  styleUrls: ['./detail-encounter.component.scss'],
})
export class DetailEncounterComponent implements OnInit {
  encounter$!: Observable<CompetitionEncounter>;

  constructor(
    private apollo: Apollo,
    private route: ActivatedRoute,
    private titleService: Title,
    private systemService: SystemService
  ) {}

  ngOnInit(): void {
    this.encounter$ = combineLatest([
      this.route.paramMap,
      this.systemService.getPrimarySystem(),
    ]).pipe(
      switchMap(([q, system]) => {
        if (!system) {
          throw new Error('No system');
        }
        return this.apollo
          .query<{ competitionEncounter: CompetitionEncounter }>({
            query: gql`
              query GetEncounter($id: ID!, $system: ID!) {
                competitionEncounter(id: $id) {
                  homeScore
                  awayScore
                  date
                  draw {
                    subEvent {
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
                      rankingPlace(where: { SystemId: $system }) {
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
              system: system.id,
            },
          })
          .pipe(
            map((result) => result.data.competitionEncounter),
            map((encounter) => new CompetitionEncounter(encounter)),
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
