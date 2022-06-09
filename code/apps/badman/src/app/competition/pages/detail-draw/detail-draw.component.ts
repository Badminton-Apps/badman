import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { map, Observable, switchMap, tap } from 'rxjs';
import { CompetitionDraw } from '../../../_shared';

@Component({
  selector: 'badman-detail-draw',
  templateUrl: './detail-draw.component.html',
  styleUrls: ['./detail-draw.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailDrawCompetitionComponent implements OnInit {
  draw$!: Observable<CompetitionDraw>;
  competitionId?: string;

  constructor(private apollo: Apollo, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.draw$ = this.route.paramMap.pipe(
      tap((params) => (this.competitionId = params.get('id') ?? undefined)),
      switchMap((params) =>
        this.apollo.query<{ competitionDraw: CompetitionDraw }>({
          query: gql`
            query GetDraw($competitionDrawId: ID!) {
              competitionDraw(id: $competitionDrawId) {
                id # needed for caching
                name
                entries {
                  id
                  team {
                    id
                    name
                    slug
                    club {
                      id
                      slug
                    }
                  }
                  standing {
                    id
                    position
                    played
                    points
                    gamesWon
                    gamesLost
                    setsWon
                    setsLost
                    totalPointsWon
                    totalPointsLost
                    tied
                    won
                    lost
                  }
                }
                encounters {
                  id
                  date
                  homeScore
                  awayScore
                  homeTeamId
                  awayTeamId
                }
              }
            }
          `,
          variables: {
            competitionDrawId: params.get('drawId'),
          },
        })
      ),
      map(({ data }) => {
        const draw = new CompetitionDraw(data.competitionDraw);

        draw.encounters?.forEach((encounter) => {
          encounter.home = draw.eventEntries.find(
            (e) => e.team?.id === encounter.homeTeamId
          )?.team;
          encounter.away = draw.eventEntries.find(
            (e) => e.team?.id === encounter.awayTeamId
          )?.team;
        });

        return draw;
      })
    );
  }
}
