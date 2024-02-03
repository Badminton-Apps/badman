import { Inject, Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';

import { distinctUntilChanged, map, shareReplay, startWith, tap } from 'rxjs/operators';

import { Claim } from '@badman/frontend-models';
import { BehaviorSubject, Observable, ReplaySubject, combineLatest } from 'rxjs';
import { AuthenticateService } from './authenticate.service';
import { InMemoryCache } from '@apollo/client/core';
import { APOLLO_CACHE } from '@badman/frontend-graphql';
import { computedAsync } from 'ngxtension/computed-async';

@Injectable({
  providedIn: 'root',
})
export class ClaimService {
  claims$ = new ReplaySubject<string[] | undefined>(1);
  private update$ = new BehaviorSubject(null);

  claims = computedAsync(() => this.claims$);

  constructor(
    private apollo: Apollo,
    @Inject(APOLLO_CACHE) private cache: InMemoryCache,
    authService: AuthenticateService,
  ) {
    combineLatest([authService.user$, this.update$])
      .pipe(
        map(([player]) => player?.permissions ?? []),
        distinctUntilChanged((a, b) => a.length === b.length),
        shareReplay(),
        startWith(undefined),
      )
      .subscribe((claims) => {
        this.claims$.next(claims);
      });
  }

  hasClaim(claim: string): boolean {
    return this.includes(this.claims(), claim);
  }

  hasAllClaims(claims: string[]): boolean {
    return claims.reduce((acc: boolean, claim) => acc && this.includes(this.claims(), claim), true);
  }

  hasAnyClaims(claims: string[]): boolean {
    return claims.reduce(
      (acc: boolean, claim) => acc || this.includes(this.claims(), claim),
      false,
    );
  }

  hasClaim$(claim: string): Observable<boolean> {
    return this.claims$.pipe(map((userClaims) => this.includes(userClaims, claim)));
  }

  hasAllClaims$(claims: string[]): Observable<boolean> {
    return this.claims$.pipe(
      map((userClaims) => {
        return claims.reduce(
          (acc: boolean, claim) => acc && this.includes(userClaims, claim),
          true,
        );
      }),
      distinctUntilChanged(),
      shareReplay(),
    );
  }

  hasAnyClaims$(claims: string[]): Observable<boolean> {
    return this.claims$.pipe(
      map((userClaims) =>
        claims.reduce((acc: boolean, claim) => acc || this.includes(userClaims, claim), false),
      ),
      shareReplay(),
      distinctUntilChanged(),
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
          mutation UpdateClaimUser($claimId: ID!, $playerId: ID!, $active: Boolean!) {
            updateGlobalClaimUser(claimId: $claimId, playerId: $playerId, active: $active) {
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
      .pipe(tap(() => this.clearUserCache([playerId])));
  }

  reloadProfile(): void {
    this.update$.next(null);
  }

  private includes(claims: string[] | undefined, claim: string): boolean {
    if (!claims) {
      return false;
    }

    if (claim.indexOf('*') >= 0) {
      const found = claims.find((r) => r?.indexOf(claim.replace('*', '')) != -1);
      return found != null && found != undefined;
    } else {
      return claims?.includes(claim);
    }
  }

  clearUserCache(users: string[]): void {
    // Clear from cache
    users.forEach((id) => {
      const normalizedId = this.cache.identify({
        id,
        __typename: 'Player',
      });
      this.cache.evict({ id: normalizedId });
    });
    this.cache.gc();
  }
}
