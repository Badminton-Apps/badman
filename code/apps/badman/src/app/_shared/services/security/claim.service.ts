import { Apollo } from 'apollo-angular';
import { Injectable } from '@angular/core';

import { distinctUntilChanged, map, tap } from 'rxjs/operators';

import * as globalClaimsQuery from '../../graphql/security/queries/GetGlobalClaims.graphql';
import * as globalUserClaimsQuery from '../../graphql/security/queries/GetGlobalUserClaims.graphql';
import * as clubClaimsQuery from '../../graphql/security/queries/GetClubClaims.graphql';

import * as updateGlobalUserClaimQuery from '../../graphql/security/mutations/UpdateClaimUser.graphql';
import { Observable } from 'rxjs';
import { Claim } from '../../models';
import { UserService } from '../profile';

@Injectable({
  providedIn: 'root',
})
export class ClaimService {
  claims$!: Observable<Claim[]>;

  constructor(private apollo: Apollo, private userService: UserService) {
    this.claims$ = userService.profile$.pipe(
      map((player) => player?.claims ?? []),
      distinctUntilChanged()
    );
  }

  hasClaim$(claim: string): Observable<boolean> {
    return this.claims$.pipe(map((claims) => this.includes(claims, claim)));
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
        query: globalClaimsQuery,
      })
      .pipe(map((x) => x.data?.claims?.map((c) => new Claim(c))));
  }

  globalUserClaims(playerId: string) {
    return this.apollo
      .query<{ player: { claims: Claim[] } }>({
        query: globalUserClaimsQuery,
        variables: {
          id: playerId,
        },
      })
      .pipe(map((x) => x.data?.player?.claims?.map((c) => new Claim(c))));
  }

  clubClaims() {
    return this.apollo
      .query<{ claims: Claim[] }>({
        query: clubClaimsQuery,
      })
      .pipe(map((x) => x.data?.claims?.map((c) => new Claim(c))));
  }

  updateGlobalUserClaim(playerId: string, claimId: string, active: boolean) {
    return this.apollo
      .mutate<{ claims: Claim[] }>({
        mutation: updateGlobalUserClaimQuery,
        variables: {
          claimId,
          playerId,
          active,
        },
      })
      .pipe(tap(() => this.userService.reloadProfile()));
  }

  private includes(claims: Claim[], claim: string): boolean {
    if (claim.indexOf('*') >= 0) {
      const found = claims.find(
        (r) => r.name?.indexOf(claim.replace('*', '')) != -1
      );
      return found != null && found != undefined;
    } else {
      return claims?.map((c) => c.name).includes(claim);
    }
  }
}
