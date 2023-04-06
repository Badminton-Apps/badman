import { isPlatformServer } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { makeStateKey, TransferState } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { Club } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { of } from 'rxjs';
import { first, map, tap } from 'rxjs/operators';

@Injectable()
export class ClubResolver implements Resolve<Club | null> {
  constructor(
    private apollo: Apollo,
    private transferState: TransferState,
    @Inject(PLATFORM_ID) private platformId: string
  ) {}

  resolve(route: ActivatedRouteSnapshot) {
    const clubId = route.params['id'];

    const STATE_KEY = makeStateKey<Club>('clubKey-' + clubId);

    if (this.transferState.hasKey(STATE_KEY)) {
      const club = this.transferState.get(STATE_KEY, null) as Partial<Club>;

      this.transferState.remove(STATE_KEY);

      if (club) {
        return of(new Club(club));
      }

      return of(null);
    } else {
      return this.apollo
        .query<{ club: Partial<Club> }>({
          query: gql`
            query Club($id: ID!) {
              club(id: $id) {
                id
                name
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
          map((result) => {
            if (!result.data.club) {
              throw new Error('No club');
            }
            return new Club(result.data.club);
          }),
          first(),
          tap((club) => {
            if (isPlatformServer(this.platformId)) {
              this.transferState.set(STATE_KEY, club);
            }
          })
        );
    }
  }
}
