import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { RankingSystemService } from '@badman/frontend-graphql';
import { RankingSystem } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { Apollo, gql } from 'apollo-angular';
import { Observable, of } from 'rxjs';
import { first, map, switchMap } from 'rxjs/operators';

@Injectable()
export class RankingSystemResolver {
  constructor(
    private apollo: Apollo,
    private raningSystemService: RankingSystemService
  ) {}

  resolve(route: ActivatedRouteSnapshot) {
    const inputId = route.params['id'] as string;
    let input: Observable<string>;

    if (inputId == 'primary') {
      input = this.raningSystemService.getPrimarySystemId();
    } else {
      input = of(inputId);
    }

    return input.pipe(
      switchMap((systemId) => {

        return this.apollo
          .query<{
            rankingSystem: Partial<RankingSystem>;
          }>({
            query: gql`
              query GetSystem($id: ID!) {
                rankingSystem(id: $id) {
                  id
                  name
                  caluclationIntervalLastUpdate
                  primary
                }
              }
            `,
            variables: {
              id: systemId,
            },
          })
          .pipe(
            transferState('rankingKey-' + systemId),
            map((result) => {
              if (!result?.data.rankingSystem) {
                throw new Error('No player');
              }
              return new RankingSystem(result.data.rankingSystem);
            }),
            first()
          );
      })
    );
  }
}
