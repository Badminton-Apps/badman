import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthenticateService, ClaimService } from '@badman/frontend-auth';
import { TranslateService } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, lastValueFrom } from 'rxjs';

import { map } from 'rxjs/operators';

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

  async canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Promise<Observable<boolean> | Promise<boolean | UrlTree> | boolean> {
    const openChangeEncounter = await lastValueFrom(
      this.apollo
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
              (events?.data?.eventCompetitions?.count ?? 0) != 0,
          ),
        ),
    );

    if (this.authService.loggedIn()) {
      if (this.claimService.hasClaim('change-any:encounter')) {
        return true;
      }

      if (this.claimService.hasClaim('*change:encounter') && openChangeEncounter) {
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
}
