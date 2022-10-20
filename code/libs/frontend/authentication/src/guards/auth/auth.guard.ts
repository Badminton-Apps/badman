import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Params,
  Router,
  UrlTree,
} from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { ConfigService } from '@badman/frontend-config';
import { TranslateService } from '@ngx-translate/core';
import { combineLatest, Observable, of, Subject } from 'rxjs';
import {
  debounceTime,
  filter,
  finalize,
  first,
  map,
  switchMap,
  tap,
} from 'rxjs/operators';
import { ClaimService } from '../../services';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  private loader$ = new Subject<boolean>();
  public loader = false;

  constructor(
    private auth: AuthService,
    private claimService: ClaimService,
    private snackBar: MatSnackBar,
    private router: Router,
    private translate: TranslateService,
    private configService: ConfigService
  ) {
    this.loader$.pipe(debounceTime(300)).subscribe((loader) => {
      this.loader = loader;
    });
  }

  canActivate(
    next: ActivatedRouteSnapshot
  ): Observable<boolean> | Promise<boolean | UrlTree> | boolean {
    this.loader$.next(true);

    // If we have AuthGuard you have to be logged in
    const loggedIn$ = this.auth.isAuthenticated$.pipe(
      switchMap((loggedIn) => {
        if (!loggedIn) {
          this.claimService.claims$.next(undefined);
          return this.auth.loginWithPopup().pipe(map(() => true));
        } else {
          return of(true);
        }
      })
    );

    return loggedIn$.pipe(
      switchMap(() => this.claimService.claims$),
      filter((claims) => claims !== undefined),
      
      // Conmbine all permissions and check if all are true
      switchMap((loggedIn) => {
        if (loggedIn) {
          const permissionObsrevables$: Observable<boolean>[] = [];

          if (next?.data?.['claims']) {
            if (typeof next.data?.['claims'] === 'string') {
              permissionObsrevables$.push(
                this.claimService.hasClaim$(
                  this.replaceParams(next.params, [next.data?.['claims']])[0]
                )
              );
            } else {
              if (next.data?.['claims'].any) {
                if (typeof next.data?.['claims'].any === 'string') {
                  next.data['claims'].any = [next.data?.['claims'].any];
                }
                permissionObsrevables$.push(
                  this.claimService.hasAnyClaims$(
                    this.replaceParams(next.params, next.data?.['claims'].any)
                  )
                );
              } else if (next.data?.['claims'].all) {
                if (typeof next.data?.['claims'].all === 'string') {
                  next.data['claims'].all = [next.data?.['claims'].all];
                }
                permissionObsrevables$.push(
                  this.claimService.hasAllClaims$(
                    this.replaceParams(next.params, next.data?.['claims'].all)
                  )
                );
              }
            }
          }

          return combineLatest(permissionObsrevables$).pipe(
            map((results: boolean[]) => {
              return results.reduce((acc, value) => acc && value, true);
            })
          );
        } else {
          return of(false);
        }
      }),
      tap((r) => {
        if (r == false) {
          if (this.configService.isProduction) {
            console.warn('No permissions', next.data?.['claims']);
          }
          this.snackBar.open(this.translate.instant('permission.no-perm'));
          this.router.navigate(['/']);
        }
      }),
      finalize(() => {
        this.loader$.next(false);
      })
    );
  }

  private replaceParams(params: Params, claims: string[]): string[] {
    // replace with params
    for (const [key, value] of Object.entries(params)) {
      claims = claims.map((c) => c.replace(`[:${key}]`, value as string));
    }

    return claims;
  }
}

function waitFor<T>(signal: Observable<any>) {
  return (source: Observable<T>) =>
    signal.pipe(
      first(),
      switchMap((_) => source)
    );
}
