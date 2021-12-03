import { Apollo } from 'apollo-angular';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Claim } from 'app/_shared';
import { map, tap } from 'rxjs/operators';

import * as globalClaimsQuery from '../../graphql/security/queries/GetGlobalClaims.graphql';
import * as globalUserClaimsQuery from '../../graphql/security/queries/GetGlobalUserClaims.graphql';
import * as clubClaimsQuery from '../../graphql/security/queries/GetClubClaims.graphql';

import * as updateGlobalUserClaimQuery from '../../graphql/security/mutations/UpdateClaimUser.graphql';
import { PermissionService } from './permission.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ClaimService {
  constructor(private apollo: Apollo, private permissionService: PermissionService) {}

  hasClaim$(claim: string): Observable<boolean> {
    return this.permissionService.userPermissions$.pipe(map((userClaims) => this.includes(userClaims, claim)));
  }

  hasAllClaims$(claims: string[]): Observable<boolean> {
    return this.permissionService.userPermissions$.pipe(
      map((userClaims) => {
        return claims.reduce((acc: boolean, claim) => acc && this.includes(userClaims, claim), true);
      })
    );
  }

  hasAnyClaims$(claims: string[]): Observable<boolean> {
    return this.permissionService.userPermissions$.pipe(
      map((userClaims) => claims.reduce((acc: boolean, claim) => acc || this.includes(userClaims, claim), false)),
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
      .pipe(tap(() => this.permissionService.reloadPermissions()));
  }

  private includes(claims: string[], claim: string): boolean {
    if (claim.indexOf('*') >= 0) {
      const found = claims.find((r) => r.indexOf(claim.replace('*', '')) != -1);
      return found != null && found != undefined;
    } else {
      return claims.includes(claim);
    }
  }
}
