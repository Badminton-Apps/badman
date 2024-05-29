import { Injectable, PLATFORM_ID, TransferState, inject } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { Team } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { Apollo, gql } from 'apollo-angular';
import { first, map } from 'rxjs/operators';

@Injectable()
export class TeamResolver {
  private apollo = inject(Apollo);
  private stateTransfer = inject(TransferState);
  private platformId = inject<string>(PLATFORM_ID);

  resolve(route: ActivatedRouteSnapshot) {
    const teamId = route.params['id'];

    return this.apollo
      .query<{ team: Partial<Team> }>({
        query: gql`
          query Team($id: ID!) {
            team(id: $id) {
              id
              name
              slug
              teamNumber
              season
              captainId
              type
              clubId
              email
              phone
              preferredDay
              preferredTime
              entry {
                id
                date
                subEventCompetition {
                  id
                  name
                }
              }
              players {
                id
                fullName
                teamMembership {
                  id
                  membershipType
                }
              }
              club {
                id
                name
              }
            }
          }
        `,
        variables: {
          id: teamId,
        },
      })
      .pipe(
        transferState('teamKey-' + teamId, this.stateTransfer, this.platformId),
        map((result) => {
          if (!result?.data.team) {
            throw new Error('No team');
          }
          return new Team(result.data.team);
        }),
        first(),
      );
  }
}
