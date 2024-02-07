import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  ActivatedRouteSnapshot,
  Params,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { AuthenticateService, ClaimService } from '../services';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard {
  private authService?: AuthenticateService;

  constructor(
    private claimService: ClaimService,
    private snackBar: MatSnackBar,
    private router: Router,
    private translate: TranslateService,
    @Inject(PLATFORM_ID) private platformId: string,
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.authService = inject(AuthenticateService);
    }
  }

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<boolean> | Promise<boolean | UrlTree> | boolean {
    // Check if we are on the server
    if (isPlatformServer(this.platformId)) {
      return true;
    }

    if (!this.authService) {
      console.warn('AuthGuard: No AuthService');
      return false;
    }

    if (this.authService.loggedInSignal()) {
      if (this.hasPermissions(next)) {
        return true;
      }

      // we dont' have the permissions
      this.snackBar.open(this.translate.instant('all.permission.no-perm'));
      this.router.navigate(['/']);
    } else {
      // we are not logged in
      this.authService.login(false, {
        appState: { target: state.url },
      });
    }

    return false;
  }

  private hasPermissions(next: ActivatedRouteSnapshot) {
    const permission: boolean[] = [];

    if (next?.data?.['claims']) {
      if (typeof next.data?.['claims'] === 'string') {
        permission.push(
          this.claimService.hasClaim(this.replaceParams(next.params, [next.data?.['claims']])[0]),
        );
      } else {
        if (next.data?.['claims'].any) {
          if (typeof next.data?.['claims'].any === 'string') {
            next.data['claims'].any = [next.data?.['claims'].any];
          }
          permission.push(
            this.claimService.hasAnyClaims(
              this.replaceParams(next.params, next.data?.['claims'].any),
            ),
          );
        } else if (next.data?.['claims'].all) {
          if (typeof next.data?.['claims'].all === 'string') {
            next.data['claims'].all = [next.data?.['claims'].all];
          }
          permission.push(
            this.claimService.hasAllClaims(
              this.replaceParams(next.params, next.data?.['claims'].all),
            ),
          );
        }
      }
    } else {
      permission.push(true);
    }

    return permission.reduce((acc, value) => acc && value, true);
  }

  private replaceParams(params: Params, claims: string[]): string[] {
    // replace with params
    for (const [key, value] of Object.entries(params)) {
      claims = claims.map((c) => c.replace(`[:${key}]`, value as string));
    }

    return claims;
  }
}
