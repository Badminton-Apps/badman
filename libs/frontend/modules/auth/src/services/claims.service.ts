import { Injectable, inject } from '@angular/core';

import { distinctUntilChanged, map, shareReplay, startWith } from 'rxjs/operators';

import { toObservable } from '@angular/core/rxjs-interop';
import { APOLLO_CACHE } from '@badman/frontend-graphql';
import { computedAsync } from 'ngxtension/computed-async';
import { BehaviorSubject, ReplaySubject, combineLatest } from 'rxjs';
import { AuthenticateService } from './authenticate.service';

@Injectable({
  providedIn: 'root',
})
export class ClaimService {
  private readonly cache = inject(APOLLO_CACHE);
  private readonly authService = inject(AuthenticateService);

  claims$ = new ReplaySubject<string[] | undefined>(1);
  private update$ = new BehaviorSubject(null);

  claims = computedAsync(() => this.claims$);
  user$ = toObservable(this.authService.userSignal);

  constructor() {
    combineLatest([this.user$, this.update$])
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
