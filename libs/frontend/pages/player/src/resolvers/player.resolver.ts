import { Injectable, Injector, PLATFORM_ID, TransferState, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot } from '@angular/router';
import { RankingSystemService } from '@badman/frontend-graphql';
import { Player } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { Apollo, gql } from 'apollo-angular';
import { filter, first, map, switchMap } from 'rxjs/operators';

@Injectable()
export class PlayerResolver {
  private apollo = inject(Apollo);
  private stateTransfer = inject(TransferState);
  private platformId = inject<string>(PLATFORM_ID);
  private systemService = inject(RankingSystemService);
  private injector = inject(Injector);

  resolve(route: ActivatedRouteSnapshot) {
    const playerId = route.params['id'];

    return toObservable(this.systemService.systemId, {
      injector: this.injector,
    }).pipe(
      filter((systemId) => !!systemId),
      switchMap((systemId) =>
        this.apollo.query<{ player: Partial<Player> }>({
          query: gql`
            query GetPlayerInfo($id: ID!, $systemId: ID!) {
              player(id: $id) {
                id
                slug
                fullName
                firstName
                lastName
                memberId
                gender
                sub
                competitionPlayer
                clubs {
                  id
                  slug
                  name
                  clubMembership {
                    id
                    membershipType
                    active
                    confirmed
                  }
                }
                rankingLastPlaces(where: { systemId: $systemId }) {
                  id
                  single
                  singlePoints
                  double
                  doublePoints
                  mix
                  mixPoints
                  systemId
                }
              }
            }
          `,
          variables: {
            id: playerId,
            systemId,
          },
        }),
      ),
      transferState('playerKey-' + playerId, this.stateTransfer, this.platformId),
      map((result) => {
        if (!result?.data.player) {
          throw new Error('No player');
        }
        return new Player(result.data.player);
      }),
      first(),
    );
  }
}
