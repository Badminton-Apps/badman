import { Inject, Injectable, PLATFORM_ID, TransferState, inject } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { Role } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { Apollo, gql } from 'apollo-angular';
import { first, map } from 'rxjs/operators';

@Injectable()
export class RoleResolver {
  private apollo = inject(Apollo);
  private stateTransfer = inject(TransferState);
  private platformId = inject<string>(PLATFORM_ID);

  resolve(route: ActivatedRouteSnapshot) {
    const roleId = route.params['id'];

    return this.apollo
      .query<{ role: Partial<Role> }>({
        query: gql`
          query Role($id: ID!) {
            role(id: $id) {
              id
              name
              claims {
                name
              }
            }
          }
        `,
        variables: {
          id: roleId,
        },
      })
      .pipe(
        transferState('roleKey-' + roleId, this.stateTransfer, this.platformId),
        map((result) => {
          if (!result?.data.role) {
            throw new Error('No role');
          }
          return new Role(result.data.role);
        }),
        first(),
      );
  }
}
