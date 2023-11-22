import {
  Inject,
  Injectable,
  PLATFORM_ID,
  TransferState,
  inject,
} from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { RankingSystemService } from '@badman/frontend-graphql';
import { Player } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { Apollo, gql } from 'apollo-angular';
import { first, map, switchMap } from 'rxjs/operators';

@Injectable()
export class PlayerResolver {
  private systemService = inject(RankingSystemService);

  constructor(
    private apollo: Apollo,
    private stateTransfer: TransferState,
    @Inject(PLATFORM_ID) private platformId: string,
  ) {}

  resolve(route: ActivatedRouteSnapshot) {
    const playerId = route.params['id'];

    return this.systemService.getPrimarySystemId().pipe(
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
      transferState(
        'playerKey-' + playerId,
        this.stateTransfer,
        this.platformId,
      ),
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
