import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { Team } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { Apollo, gql } from 'apollo-angular';
import { first, map } from 'rxjs/operators';

@Injectable()
export class TeamResolver {
  private apollo = inject(Apollo);

  resolve(route: ActivatedRouteSnapshot) {
    const teamId = route.params['id'];

    return this.apollo
      .query<{ team: Partial<Team> }>({
        query: gql`
          query Team($id: ID!) {
            team(id: $id) {
              id
              name
            }
          }
        `,
        variables: {
          id: teamId,
        },
      })
      .pipe(
        map((result) => {
          if (!result.data.team) {
            throw new Error('No team');
          }
          return new Team(result.data.team);
        }),
        transferState<Team>(`team-${teamId}`),
        first(),
      );
  }
}
