import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { GAME_INFO } from 'app/modules/game';
import { TournamentDraw } from 'app/_shared';
import { map, Observable, switchMap, tap } from 'rxjs';

@Component({
  selector: 'app-detail-draw',
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
      switchMap((params) =>
        this.apollo.query<{ tournamentDraw: TournamentDraw }>({
          query: gql`
            ${GAME_INFO}
            query GetTournamentDraw($tournamentDrawId: ID!) {
              tournamentDraw(id: $tournamentDrawId) {
                id
                name
                type
                entries {
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
            tournamentDrawId: params.get('drawId')!,
          },
        })
      ),
      map(({ data }) => new TournamentDraw(data.tournamentDraw))
    );
  }
}
