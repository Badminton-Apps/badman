import { Inject, Injectable, PLATFORM_ID, TransferState } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { EncounterCompetition } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { Apollo, gql } from 'apollo-angular';
import { first, map } from 'rxjs/operators';

@Injectable()
export class EncounterResolver {
  constructor(
    private apollo: Apollo,

    private stateTransfer: TransferState,
    @Inject(PLATFORM_ID) private platformId: string
  ) {}

  resolve(route: ActivatedRouteSnapshot) {
    const encounterId = route.params['id'];

    return this.apollo
      .query<{ encounterCompetition: Partial<EncounterCompetition> }>({
        query: gql`
          query GetEncounter($id: ID!) {
            encounterCompetition(id: $id) {
              id
              homeScore
              awayScore
              date
              drawCompetition {
                subEventCompetition {
                  eventType
                }
              }
              home {
                id
                name
              }
              away {
                id
                name
              }
              games {
                id
                order
                gameType
                linkType
                set1Team1
                set1Team2
                set2Team1
                set2Team2
                set3Team1
                set3Team2
                status
                winner
                playedAt
                players {
                  id
                  slug
                  fullName
                  team
                  player
                  single
                  double
                  mix
                }
              }
              location {
                id
                name
              }
            }
          }
        `,
        variables: {
          id: encounterId,
        },
      })
      .pipe(
        transferState(
          `encounterKey-${encounterId}`,
          this.stateTransfer,
          this.platformId
        ),
        map((result) => {
          if (!result?.data.encounterCompetition) {
            throw new Error('No encounter found!');
          }
          return new EncounterCompetition(result.data.encounterCompetition);
        }),

        first()
      );
  }
}
