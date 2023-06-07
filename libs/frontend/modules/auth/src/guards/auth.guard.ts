import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { Inject, Injectable, Injector, PLATFORM_ID } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  ActivatedRouteSnapshot,
  Params,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Observable, Subject, combineLatest, of } from 'rxjs';
import {
  debounceTime,
  filter,
  finalize,
  map,
  switchMap,
  tap,
} from 'rxjs/operators';
import { AuthenticateService, ClaimService } from '../services';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard {
  // Maybe use this for cokkies? https://github.com/ngx-utils/cookies/

  private loader$ = new Subject<boolean>();
  public loader = false;
  private authService?: AuthenticateService;

  constructor(
    private claimService: ClaimService,
    private snackBar: MatSnackBar,
    private router: Router,
    private translate: TranslateService,
    private injector: Injector,
    @Inject(PLATFORM_ID) private platformId: string
  ) {
    this.loader$.pipe(debounceTime(300)).subscribe((loader) => {
      this.loader = loader;
    });

    if (isPlatformBrowser(this.platformId)) {
      this.authService = this.injector.get(AuthenticateService);
    }
  }

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean | UrlTree> | boolean {
    this.loader$.next(true);

    // Check if we are on the server
    if (isPlatformServer(this.platformId)) {
      return true;
    }

    if (!this.authService || !this.authService.loggedIn$) {
      console.warn('AuthGuard: No AuthService');
      return false;
    }

    const auth$: Observable<boolean> = this.authService.loggedIn$.pipe(
      switchMap((isAuthenticated) => {
        if (!this.authService) {
          console.warn('AuthGuard: No AuthService');
          return of(true);
        }

        if (!isAuthenticated) {
          return (
            this.authService
              .login(false, {
                appState: { target: state.url },
              })
              ?.pipe(
                map(() => {
                  return true;
                })
              ) ?? of(true)
          );
        }

        return of(true);
      })
    );

    return auth$.pipe(
      filter((isAuthenticated) => isAuthenticated),
      switchMap(() => this.claimService.claims$),
      filter((claims) => claims !== undefined),
      switchMap(() => {
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
        } else {
          permissionObsrevables$.push(of(true));
        }

        return combineLatest(permissionObsrevables$).pipe(
          map((results: boolean[]) => {
            return results.reduce((acc, value) => acc && value, true);
          })
        );
      }),
      tap((hasPermissions) => {
        if (!hasPermissions) {
          this.snackBar.open(this.translate.instant('all.permission.no-perm'));
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
