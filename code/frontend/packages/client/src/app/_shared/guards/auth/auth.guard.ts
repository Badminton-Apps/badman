import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Params,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { environment } from 'environments/environment';
import { combineLatest, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { AuthService } from '../../services/security/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private snackBar: MatSnackBar) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean | UrlTree> | boolean {
    const canActivateObservables$ = [];

    if (next.data.claims) {
      if (typeof next.data.claims === 'string') {
        canActivateObservables$.push(
          this.auth.hasClaim$(
            this.replaceParams(next.params, [next.data.claims])[0]
          )
        );
      } else {
        if (next.data.claims.any) {
          if (typeof next.data.claims.any === 'string') {
            next.data.claims.any = [next.data.claims.any];
          }
          canActivateObservables$.push(
            this.auth.hasAnyClaims$(
              this.replaceParams(next.params, next.data.claims.any)
            )
          );
        } else if (next.data.claims.all) {
          if (typeof next.data.claims.all === 'string') {
            next.data.claims.all = [next.data.claims.all];
          }
          canActivateObservables$.push(
            this.auth.hasAllClaims$(
              this.replaceParams(next.params, next.data.claims.all)
            )
          );
        }
      }
    } else {
      // not allowed
      canActivateObservables$.push(
        this.auth.isAuthenticated$.pipe(
          tap((loggedIn) => {
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
      }),
      tap((r) => {
        if (r == false) {
          if (environment.production == false) {
            console.warn('No permissions', next.data.claims);
          }

          this.snackBar.open("You don't have the permissions for this");
        }
      })
    );
  }

  private replaceParams(params: any, claims: string[]): string[] {
    // replace with params
    for (const [key, value] of Object.entries(params)) {
      claims = claims.map(c => c.replace(`[:${key}]`, value as string));
    }

    return claims;
  }
}
