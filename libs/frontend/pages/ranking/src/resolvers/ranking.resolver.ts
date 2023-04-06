import { isPlatformServer } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { makeStateKey, TransferState } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { RankingSystem } from '@badman/frontend-models';
import { RankingSystemService } from '@badman/frontend-graphql';
import { Apollo, gql } from 'apollo-angular';
import { Observable, of } from 'rxjs';
import { first, map, switchMap, tap } from 'rxjs/operators';

@Injectable()
export class RankingSystemResolver implements Resolve<RankingSystem> {
  constructor(
    private apollo: Apollo,
    private raningSystemService: RankingSystemService,
    private transferState: TransferState,
    @Inject(PLATFORM_ID) private platformId: string
  ) {}

  resolve(route: ActivatedRouteSnapshot) {
    const inputId = route.params['id'] as string;
    let input: Observable<string>;

    if (inputId == 'primary') {
      input = this.raningSystemService.getPrimarySystemId();
    } else {
      input = of(inputId);
    }

    return input.pipe(
      switchMap((systemId) => {
        const STATE_KEY = makeStateKey<RankingSystem>('rankingKey-' + systemId);

        if (this.transferState.hasKey(STATE_KEY)) {
          const player = this.transferState.get(
            STATE_KEY,
            null
          ) as Partial<RankingSystem>;

          this.transferState.remove(STATE_KEY);

          if (player) {
            return of(new RankingSystem(player));
          }

          return of();
        } else {
          return this.apollo
            .query<{
              rankingSystem: Partial<RankingSystem>;
            }>({
              query: gql`
                query GetSystem($id: ID!) {
                  rankingSystem(id: $id) {
                    id
                    name
                    amountOfLevels
                    pointsToGoUp
                    pointsToGoDown
                    pointsWhenWinningAgainst
                    caluclationIntervalLastUpdate
                    primary
                  }
                }
              `,
              variables: {
                id: systemId,
              },
            })
            .pipe(
              map((result) => {
                if (!result.data.rankingSystem) {
                  throw new Error('No player');
                }
                return new RankingSystem(result.data.rankingSystem);
              }),
              first(),
              tap((player) => {
                if (isPlatformServer(this.platformId)) {
                  this.transferState.set(STATE_KEY, player);
                }
              })
            );
        }
      })
    );
  }
}
