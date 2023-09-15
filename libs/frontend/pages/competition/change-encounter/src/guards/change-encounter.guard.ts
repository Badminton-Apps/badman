import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { AuthenticateService, ClaimService } from '@badman/frontend-auth';
import { Apollo, gql } from 'apollo-angular';
import { Observable, combineLatest, of } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

import { filter, map, switchMap, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class CanChangeEncounterGuard {
  private claimService = inject(ClaimService);
  private apollo = inject(Apollo);
  private authService = inject(AuthenticateService);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private router = inject(Router);

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean | UrlTree> | boolean {
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

    const openChangeEncounter = this.apollo
      .query<{
        eventTournaments: { count: number };
        eventCompetitions: { count: number };
      }>({
        query: gql`
          # we request only first one, because if it's more that means it's open
          query CanChange($where: JSONObject) {
            eventCompetitions(take: 1, where: $where) {
              count
            }
          }
        `,
        variables: {
          where: {
            changeOpenDate: { $lte: new Date().toISOString() },
            changeCloseDate: { $gte: new Date().toISOString() },
          },
        },
      })
      .pipe(
        map(
          (events) =>
            (events?.data?.eventTournaments?.count ?? 0) != 0 ||
            (events?.data?.eventCompetitions?.count ?? 0) != 0
        )
      );

    const canAnyChange$ = this.claimService.hasClaim$('change-any:encounter');
    const canviewChange$ = this.claimService.hasClaim$('*change:encounter');

    return auth$.pipe(
      filter((isAuthenticated) => isAuthenticated),
      switchMap(() => this.claimService.claims$),
      // undefined is when the claims are not loaded yet
      filter((claims) => claims !== undefined),
      switchMap(() =>
        combineLatest([canAnyChange$, canviewChange$, openChangeEncounter])
      ),
      map(
        ([canAnyChange, canViewChange, openChangeEncounter]) =>
          canAnyChange || (canViewChange && openChangeEncounter)
      ),
      tap((hasPermissions) => {
        if (!hasPermissions) {
          this.snackBar.open(this.translate.instant('all.permission.no-perm'));
          this.router.navigate(['/']);
        }
      })
    );
  }
}
