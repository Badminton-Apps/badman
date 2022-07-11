import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { map, Observable, switchMap, tap } from 'rxjs';
import { GAME_INFO } from '../../../modules';
import { TournamentDraw } from '../../../_shared';

@Component({
  selector: 'badman-detail-draw',
  templateUrl: './detail-draw.component.html',
  styleUrls: ['./detail-draw.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailDrawTournamentComponent implements OnInit {
  draw$!: Observable<TournamentDraw>;

  tournamentId?: string;

  constructor(private apollo: Apollo, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.draw$ = this.route.paramMap.pipe(
      tap((params) => (this.tournamentId = params.get('id') ?? undefined)),
      switchMap((params) => {
        const tournamentDrawId = params.get('drawId');
        if (!tournamentDrawId) {
          throw new Error('No id');
        }

        return this.apollo.query<{ drawTournament: TournamentDraw }>({
          query: gql`
            ${GAME_INFO}
            query GetTournamentDraw($tournamentDrawId: ID!) {
              drawTournament(id: $tournamentDrawId) {
                id
                name
                type
                eventEntries {
                  id
                  players {
                    id
                    fullName
                    slug
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
                games {
                  ...GameInfo
                }
              }
            }
          `,
          variables: {
            tournamentDrawId,
          },
        });
      }),
      map(({ data }) => new TournamentDraw(data.drawTournament))
    );
  }
}
