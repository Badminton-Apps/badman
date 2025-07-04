import { Injectable, PLATFORM_ID, TransferState, inject } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { EventTournament } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { Apollo, gql } from 'apollo-angular';
import { map } from 'rxjs/operators';

export const EVENT_QUERY = gql`
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
      firstDay
      dates
      tournamentNumber
      state
      country
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
`;

@Injectable()
export class EventResolver {
  private apollo = inject(Apollo);
  private stateTransfer = inject(TransferState);
  private platformId = inject<string>(PLATFORM_ID);

  resolve(route: ActivatedRouteSnapshot) {
    const eventId = route.params['id'];

    return this.apollo
      .watchQuery<{ eventTournament: Partial<EventTournament> }>({
        query: EVENT_QUERY,
        variables: {
          id: eventId,
        },
      })
      .valueChanges.pipe(
        transferState('eventKey-' + eventId, this.stateTransfer, this.platformId),
        map((result) => {
          if (!result?.data.eventTournament) {
            throw new Error('No event found!');
          }
          return new EventTournament(result.data.eventTournament);
        }),
      );
  }
}
