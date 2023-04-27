import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { Club } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { Apollo, gql } from 'apollo-angular';
import { first, map } from 'rxjs/operators';

@Injectable()
export class ClubResolver  {
  constructor(
    private apollo: Apollo,
  ) {}

  resolve(route: ActivatedRouteSnapshot) {
    const clubId = route.params['id'];

    return this.apollo
        .query<{ club: Partial<Club> }>({
          query: gql`
            query Club($id: ID!) {
              club(id: $id) {
                id
                name
                slug
                fullName
                abbreviation
                clubId
              }
            }
          `,
          variables: {
            id: clubId,
          },
        })
        .pipe(
          transferState(`clubKey-${clubId}`),
          map((result) => {
            if (!result?.data.club) {
              throw new Error('No club');
            }
            return new Club(result.data.club);
          }),
          first(),
         
        );
  }
}
