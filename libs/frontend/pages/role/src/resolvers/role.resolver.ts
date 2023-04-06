import { isPlatformServer } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { makeStateKey, TransferState } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { Role } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { of } from 'rxjs';
import { first, map, tap } from 'rxjs/operators';

@Injectable()
export class RoleResolver implements Resolve<Role | null> {
  constructor(
    private apollo: Apollo,
    private transferState: TransferState,
    @Inject(PLATFORM_ID) private platformId: string
  ) {}

  resolve(route: ActivatedRouteSnapshot) {
    const roleId = route.params['id'];

    const STATE_KEY = makeStateKey<Role>('roleKey-' + roleId);

    if (this.transferState.hasKey(STATE_KEY)) {
      const role = this.transferState.get(STATE_KEY, null);

      if (role) {
        return of(new Role(role));
      }

      return of(null);
    } else {
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
          map((result) => {
            if (!result.data.role) {
              throw new Error('No role');
            }
            return new Role(result.data.role);
          }),
          first(),
          tap((role) => {
            if (isPlatformServer(this.platformId)) {
              this.transferState.set(STATE_KEY, role);
            }
          })
        );
    }
  }
}
