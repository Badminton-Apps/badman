import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';

import { distinctUntilChanged, map, shareReplay, tap } from 'rxjs/operators';

import { Observable, ReplaySubject } from 'rxjs';
import { Claim } from '@badman/frontend/models';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root',
})
export class ClaimService {
  claims$ = new ReplaySubject<string[] | undefined>(1);

  constructor(private apollo: Apollo, private userService: UserService) {
    userService.profile$
      .pipe(
        map((player) => player?.permissions ?? []),
        distinctUntilChanged((a, b) => a.length === b.length),
        shareReplay()
      )
      .subscribe((claims) => {
        this.claims$.next(claims);
      });
  }

  hasClaim$(claim: string): Observable<boolean> {
    return this.claims$.pipe(
      map((userClaims) => this.includes(userClaims, claim))
    );
  }

  hasAllClaims$(claims: string[]): Observable<boolean> {
    return this.claims$.pipe(
      map((userClaims) => {
        return claims.reduce(
          (acc: boolean, claim) => acc && this.includes(userClaims, claim),
          true
        );
      }),
      distinctUntilChanged()
    );
  }

  hasAnyClaims$(claims: string[]): Observable<boolean> {
    return this.claims$.pipe(
      map((userClaims) =>
        claims.reduce(
          (acc: boolean, claim) => acc || this.includes(userClaims, claim),
          false
        )
      ),
      distinctUntilChanged()
    );
  }

  globalClaims() {
    return this.apollo
      .query<{ claims: Claim[] }>({
        query: gql`
          query GetClaims {
            claims(where: { type: "GLOBAL" }) {
              id
              name
              description
              category
            }
          }
        `,
      })
      .pipe(map((x) => x.data?.claims?.map((c) => new Claim(c))));
  }

  globalUserClaims(playerId: string) {
    return this.apollo
      .query<{ player: { claims: Claim[] } }>({
        query: gql`
          query GetUserClaims($id: ID!) {
            player(id: $id) {
              id
              claims {
                id
                name
                description
                category
              }
            }
          }
        `,
        variables: {
          id: playerId,
        },
      })
      .pipe(map((x) => x.data?.player?.claims?.map((c) => new Claim(c))));
  }

  updateGlobalUserClaim(playerId: string, claimId: string, active: boolean) {
    return this.apollo
      .mutate<{ claims: Claim[] }>({
        mutation: gql`
          mutation UpdateClaimUser(
            $claimId: ID!
            $playerId: ID!
            $active: Boolean!
          ) {
            updateGlobalClaimUser(
              claimId: $claimId
              playerId: $playerId
              active: $active
            ) {
              id
            }
          }
        `,
        variables: {
          claimId,
          playerId,
          active,
        },
      })
      .pipe(tap(() => this.userService.reloadProfile()));
  }

  private includes(claims: string[] | undefined, claim: string): boolean {
    if (!claims) {
      return false;
    }

    if (claim.indexOf('*') >= 0) {
      const found = claims.find(
        (r) => r?.indexOf(claim.replace('*', '')) != -1
      );
      return found != null && found != undefined;
    } else {
      return claims?.includes(claim);
    }
  }
}
