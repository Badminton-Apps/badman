import { AuthService } from '../../services/auth/auth.service';
import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
  CanActivate
} from '@angular/router';
import { Observable, merge, combineLatest } from 'rxjs';
import { tap, combineAll, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean | UrlTree> | boolean {
    const canActivateObservables$ = [];

    if (next.data.claims) {
      if (typeof next.data.claims === 'string') {
        canActivateObservables$.push(
          this.auth.hasClaim$(next.data.claims as string)
        );
      } else {
        if (next.data.claims.any) {
          if (typeof next.data.claims.any === 'string') {
            next.data.claims.any = [next.data.claims.any];
          }
          canActivateObservables$.push(
            this.auth.hasAnylaims$(next.data.claims.any)
          );
        } else if (next.data.claims.all) {
          if (typeof next.data.claims.all === 'string') {
            next.data.claims.all = [next.data.claims.all];
          }
          canActivateObservables$.push(
            this.auth.hasAllClaims$(next.data.claims.all)
          );
        }
      }
    } else {
      canActivateObservables$.push(
        this.auth.isAuthenticated$.pipe(
          tap(loggedIn => {
            if (!loggedIn) {
              this.auth.login(state.url);
            }
          })
        )
      );
    }

    return combineLatest(canActivateObservables$).pipe(
      map((results: boolean[]) => {
        return results.reduce((acc, value) => acc && value, true);
      })
    );
  }
}
