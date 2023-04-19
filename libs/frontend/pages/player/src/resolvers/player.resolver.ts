import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { Player } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { Apollo, gql } from 'apollo-angular';
import { first, map } from 'rxjs/operators';

@Injectable()
export class PlayerResolver {
  constructor(private apollo: Apollo) {}

  resolve(route: ActivatedRouteSnapshot) {
    const playerId = route.params['id'];

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
        transferState('playerKey-' + playerId),
        map((result) => {
          if (!result?.data.player) {
            throw new Error('No player');
          }
          return new Player(result.data.player);
        }),
        first()
      );
  }
}
