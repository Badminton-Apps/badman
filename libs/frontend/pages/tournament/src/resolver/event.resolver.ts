import { Injectable, PLATFORM_ID, TransferState, inject } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { EventTournament } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { Apollo, gql } from 'apollo-angular';
import { first, map } from 'rxjs/operators';

@Injectable()
export class EventResolver {
  private apollo = inject(Apollo);
  private stateTransfer = inject(TransferState);
  private platformId = inject<string>(PLATFORM_ID);

  resolve(route: ActivatedRouteSnapshot) {
    const eventId = route.params['id'];

    return this.apollo
      .query<{ eventTournament: Partial<EventTournament> }>({
        query: gql`
          query EventTournament($id: ID!) {
            eventTournament(id: $id) {
              id
              name
              slug
              openDate
              closeDate
              visualCode
              lastSync
              official
              subEventTournaments {
                id
                name
                eventType
                level
                rankingGroups {
                  id
                  name
                }
                drawTournaments {
                  id
                  name
                  size
                }
              }
            }
          }
        `,
        variables: {
          id: eventId,
        },
      })
      .pipe(
        transferState('eventKey-' + eventId, this.stateTransfer, this.platformId),
        map((result) => {
          if (!result?.data.eventTournament) {
            throw new Error('No event found!');
          }
          return new EventTournament(result.data.eventTournament);
        }),

        first(),
      );
  }
}
