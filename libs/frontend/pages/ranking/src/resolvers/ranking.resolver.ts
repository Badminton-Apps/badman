import { Injectable, PLATFORM_ID, TransferState, inject } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { RankingSystemService } from '@badman/frontend-graphql';
import { RankingSystem } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { Apollo, gql } from 'apollo-angular';
import { first, map } from 'rxjs/operators';

@Injectable()
export class RankingSystemResolver {
  private apollo = inject(Apollo);
  private raningSystemService = inject(RankingSystemService);
  private stateTransfer = inject(TransferState);
  private platformId = inject<string>(PLATFORM_ID);

  resolve(route: ActivatedRouteSnapshot) {
    const inputId = route.params['id'] as string;
    let systemId: string;
    const loaded = this.raningSystemService.systemId();

    if (inputId == 'primary' && loaded) {
      systemId = loaded;
    } else {
      systemId = inputId;
    }

    return this.apollo
      .query<{
        rankingSystem: Partial<RankingSystem>;
      }>({
        query: gql`
          query GetSystem($id: ID!) {
            rankingSystem(id: $id) {
              id
              name
              calculationLastUpdate
              primary
            }
          }
        `,
        variables: {
          id: systemId,
        },
      })
      .pipe(
        transferState('rankingKey-' + systemId, this.stateTransfer, this.platformId),
        map((result) => {
          if (!result?.data.rankingSystem) {
            throw new Error('No player');
          }
          return new RankingSystem(result.data.rankingSystem);
        }),
        first(),
      );
  }
}
