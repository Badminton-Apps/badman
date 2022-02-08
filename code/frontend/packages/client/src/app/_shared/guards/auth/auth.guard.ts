import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRouteSnapshot, CanActivate, Params, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { TranslateService } from '@ngx-translate/core';
import { ClaimService } from 'app/_shared';
import { environment } from 'environments/environment';
import { combineLatest, Observable, of, Subject } from 'rxjs';
import { debounceTime, map, switchMap, tap, finalize } from 'rxjs/operators';

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
    private translate: TranslateService
  ) {
    this.loader$.pipe(debounceTime(300)).subscribe((loader) => {
      this.loader = loader;
    });
  }

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean | UrlTree> | boolean {
    this.loader$.next(true);
    const canActivateObservables$: Observable<boolean>[] = [];

    // If we have AuthGuard you have to be logged in
    canActivateObservables$.push(
      this.auth.isAuthenticated$.pipe(
        switchMap((loggedIn) => {
          if (!loggedIn) {
            return this.auth.loginWithPopup().pipe(map(() => true));
          } else {
            return of(true);
          }
        })
      )
    );

    if (next?.data?.['claims'] && next.data?.['claims'].length > 0) {
      if (typeof next.data?.['claims'] === 'string') {
        canActivateObservables$.push(
          this.claimService.hasClaim$(this.replaceParams(next.params, [next.data?.['claims']])?.at(0))
        );
      } else {
        if (next.data?.['claims'].any) {
          if (typeof next.data?.['claims'].any === 'string') {
            next.data['claims'].any = [next.data?.['claims'].any];
          }
          canActivateObservables$.push(
            this.claimService.hasAnyClaims$(this.replaceParams(next.params, next.data?.['claims'].any))
          );
        } else if (next.data?.['claims'].all) {
          if (typeof next.data?.['claims'].all === 'string') {
            next.data['claims'].all = [next.data?.['claims'].all];
          }
          canActivateObservables$.push(
            this.claimService.hasAllClaims$(this.replaceParams(next.params, next.data?.['claims'].all))
          );
        }
      }
    }

    return combineLatest(canActivateObservables$).pipe(
      map((results: boolean[]) => {
        return results.reduce((acc, value) => acc && value, true);
      }),
      tap((r) => {
        if (r == false) {
          if (environment.production == false) {
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

  private replaceParams(params: any, claims: string[]): string[] {
    // replace with params
    for (const [key, value] of Object.entries(params)) {
      claims = claims.map((c) => c.replace(`[:${key}]`, value as string));
    }

    return claims;
  }
}
