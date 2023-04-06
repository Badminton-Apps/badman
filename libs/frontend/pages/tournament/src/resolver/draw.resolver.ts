import { isPlatformServer } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { makeStateKey, TransferState } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { DrawTournament } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { of } from 'rxjs';
import { first, map, tap } from 'rxjs/operators';

@Injectable()
export class DrawResolver implements Resolve<DrawTournament | null> {
  constructor(
    private apollo: Apollo,
    private transferState: TransferState,
    @Inject(PLATFORM_ID) private platformId: string
  ) {}

  resolve(route: ActivatedRouteSnapshot) {
    const drawId = route.params['id'];

    const STATE_KEY = makeStateKey<DrawTournament>('drawKey-' + drawId);

    if (this.transferState.hasKey(STATE_KEY)) {
      const drawTournament = this.transferState.get(
        STATE_KEY,
        null
      ) as Partial<DrawTournament>;

      this.transferState.remove(STATE_KEY);

      if (drawTournament) {
        return of(new DrawTournament(drawTournament));
      }

      return of(null);
    } else {
      return this.apollo
        .query<{ drawTournament: Partial<DrawTournament> }>({
          query: gql`
            query GetDraw($id: ID!) {
              drawTournament(id: $id) {
                id # needed for caching
                name
                eventEntries {
                  id
                  players {
                    id
                    slug
                    fullName
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
            if (!result.data.drawTournament) {
              throw new Error('No draw found');
            }
            return new DrawTournament(result.data.drawTournament);
          }),
          tap((drawTournament) => {
            if (isPlatformServer(this.platformId)) {
              this.transferState.set(STATE_KEY, drawTournament);
            }
          }),
          first()
        );
    }
  }
}
