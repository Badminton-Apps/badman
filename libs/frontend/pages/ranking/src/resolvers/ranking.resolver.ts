import { Inject, Injectable, PLATFORM_ID, TransferState } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { RankingSystemService } from '@badman/frontend-graphql';
import { RankingSystem } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { Apollo, gql } from 'apollo-angular';
import { first, map } from 'rxjs/operators';

@Injectable()
export class RankingSystemResolver {
  constructor(
    private apollo: Apollo,
    private raningSystemService: RankingSystemService,
    private stateTransfer: TransferState,
    @Inject(PLATFORM_ID) private platformId: string,
  ) {}

  resolve(route: ActivatedRouteSnapshot) {
    const inputId = route.params['id'] as string;
    let systemId: string;

    if (inputId == 'primary') {
      systemId = this.raningSystemService.systemId()!;
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
        transferState(
          'rankingKey-' + systemId,
          this.stateTransfer,
          this.platformId,
        ),
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
