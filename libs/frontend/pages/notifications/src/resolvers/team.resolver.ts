import { isPlatformServer } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { makeStateKey, TransferState } from '@angular/platform-browser';
import { ActivatedRouteSnapshot } from '@angular/router';
import { Team } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { of } from 'rxjs';
import { first, map, tap } from 'rxjs/operators';

@Injectable()
export class TeamResolver  {
  constructor(
    private apollo: Apollo,
    private transferState: TransferState,
    @Inject(PLATFORM_ID) private platformId: string
  ) {}

  resolve(route: ActivatedRouteSnapshot) {
    const teamId = route.params['id'];

    const STATE_KEY = makeStateKey<Team>('teamKey-' + teamId);

    if (this.transferState.hasKey(STATE_KEY)) {
      const team = this.transferState.get(STATE_KEY, null);

      if (team) {
        return of(new Team(team));
      }

      return of(null);
    } else {
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
          first(),
          tap((team) => {
            if (isPlatformServer(this.platformId)) {
              this.transferState.set(STATE_KEY, team);
            }
          })
        );
    }
  }
}
