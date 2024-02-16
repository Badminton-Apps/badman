import { Inject, Injectable, PLATFORM_ID, TransferState } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { DrawCompetition } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { Apollo, gql } from 'apollo-angular';
import { first, map } from 'rxjs/operators';

@Injectable()
export class DrawResolver {
  constructor(
    private apollo: Apollo,
    private stateTransfer: TransferState,
    @Inject(PLATFORM_ID) private platformId: string,
  ) {}

  resolve(route: ActivatedRouteSnapshot) {
    const drawId = route.params['id'];

    return this.apollo
      .query<{ drawCompetition: Partial<DrawCompetition> }>({
        query: gql`
          query GetDraw($id: ID!) {
            drawCompetition(id: $id) {
              id # needed for caching
              name
              risers
              fallers
              visualCode
              eventEntries {
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
                  riser
                  faller
                }
              }
            }
          }
        `,
        variables: {
          id: drawId,
        },
      })
      .pipe(
        transferState(`drawKey-${drawId}`, this.stateTransfer, this.platformId),
        map((result) => {
          if (!result?.data.drawCompetition) {
            throw new Error('No draw found');
          }
          return new DrawCompetition(result.data.drawCompetition);
        }),
        first(),
      );
  }
}
