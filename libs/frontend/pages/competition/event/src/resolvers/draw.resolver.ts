import { isPlatformServer } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { makeStateKey, TransferState } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { DrawCompetition } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { of } from 'rxjs';
import { first, map, tap } from 'rxjs/operators';

@Injectable()
export class DrawResolver implements Resolve<DrawCompetition | null> {
  constructor(
    private apollo: Apollo,
    private transferState: TransferState,
    @Inject(PLATFORM_ID) private platformId: string
  ) {}

  resolve(route: ActivatedRouteSnapshot) {
    const drawId = route.params['id'];

    const STATE_KEY = makeStateKey<DrawCompetition>('drawKey-' + drawId);

    if (this.transferState.hasKey(STATE_KEY)) {
      const drawCompetition = this.transferState.get(
        STATE_KEY,
        null
      ) as Partial<DrawCompetition>;

      this.transferState.remove(STATE_KEY);

      if (drawCompetition) {
        return of(new DrawCompetition(drawCompetition));
      }

      return of(null);
    } else {
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
          map((result) => {
            if (!result.data.drawCompetition) {
              throw new Error('No draw found');
            }
            return new DrawCompetition(result.data.drawCompetition);
          }),
          tap((drawCompetition) => {
            if (isPlatformServer(this.platformId)) {
              this.transferState.set(STATE_KEY, drawCompetition);
            }
          }),
          first()
        );
    }
  }
}
