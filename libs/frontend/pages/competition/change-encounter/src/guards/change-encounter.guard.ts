import { Injectable, inject, isDevMode } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UrlTree } from '@angular/router';
import { ClaimService } from '@badman/frontend-auth';
import { TranslateService } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, lastValueFrom } from 'rxjs';

import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class CanChangeEncounterGuard {
  private readonly apollo = inject(Apollo);
  private readonly claimService = inject(ClaimService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  async canActivate(): Promise<Observable<boolean> | Promise<boolean | UrlTree> | boolean> {
    if (isDevMode()) {
      return true;
    }

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

    if (openChangeEncounter) {
      return true;
    }

    const canChangeAny = this.claimService.hasAnyClaims(['change-any:encounter']);
    if (canChangeAny) {
      return true;
    }

    this.snackBar.open(this.translate.instant('all.competition.change-encounter.errors.closed'));

    return false;
  }
}
