import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Claim } from 'app/_shared';
import { map, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';

import * as globalClaimsQuery from '../../graphql/security/queries/GetGlobalClaims.graphql';
import * as globalUserClaimsQuery from '../../graphql/security/queries/GetGlobalUserClaims.graphql';
import * as clubClaimsQuery from '../../graphql/security/queries/GetClubClaims.graphql';

import * as updateGlobalUserClaimQuery from '../../graphql/security/mutations/UpdateClaimUser.graphql';

@Injectable({
  providedIn: 'root',
})
export class ClaimService {
  constructor(private apollo: Apollo, private authService: AuthService) {}

  globalClaims() {
    return this.apollo
      .query<{ claims: Claim[] }>({
        query: globalClaimsQuery,
      })
      .pipe(map((x) => x.data?.claims?.map((c) => new Claim(c))));
  }

  globalUserClaims(userId: string) {
    return this.apollo
      .query<{ player: { claims: Claim[] } }>({
        query: globalUserClaimsQuery,
        variables: {
          id: userId,
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
      .query<{ claims: Claim[] }>({
        query: updateGlobalUserClaimQuery,
        variables: {
          claimId,
          playerId,
          active,
        },
      })
      .pipe(tap(() => this.authService.reloadPermissions()));
  }
}
