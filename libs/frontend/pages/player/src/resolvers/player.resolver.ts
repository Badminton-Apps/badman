import { isPlatformServer } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { makeStateKey, TransferState } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { Player } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { of } from 'rxjs';
import { first, map, tap } from 'rxjs/operators';

@Injectable()
export class PlayerResolver implements Resolve<Player> {
  constructor(
    private apollo: Apollo,
    private transferState: TransferState,
    @Inject(PLATFORM_ID) private platformId: string
  ) {}

  resolve(route: ActivatedRouteSnapshot) {
    const playerId = route.params['id'];
    const STATE_KEY = makeStateKey<Player>('playerKey-' + playerId);

    if (this.transferState.hasKey(STATE_KEY)) {
      const player = this.transferState.get(STATE_KEY, null) as Partial<Player>;

      this.transferState.remove(STATE_KEY);

      if (player) {
        return of(new Player(player));
      }

      return of();
    } else {
      return this.apollo
        .query<{ player: Partial<Player> }>({
          query: gql`
            query GetPlayerInfo($id: ID!) {
              player(id: $id) {
                id
                slug
                fullName
                firstName
                lastName
                memberId
                sub
                competitionPlayer
                clubs {
                  id
                }
              }
            }
          `,
          variables: {
            id: playerId,
          },
        })
        .pipe(
          map((result) => {
            if (!result.data.player) {
              throw new Error('No player');
            }
            return new Player(result.data.player);
          }),
          first(),
          tap((player) => {
            if (isPlatformServer(this.platformId)) {
              this.transferState.set(STATE_KEY, player);
            }
          })
        );
    }
  }
}
