import { Injectable, inject, isDevMode } from '@angular/core';
import { UrlTree } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { Observable, lastValueFrom } from 'rxjs';

import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class CanChangeEncounterGuard {
  private apollo = inject(Apollo);

  async canActivate(): Promise<Observable<boolean> | Promise<boolean | UrlTree> | boolean> {
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

    if (openChangeEncounter || isDevMode()) {
      return true;
    }

    return false;
  }
}
