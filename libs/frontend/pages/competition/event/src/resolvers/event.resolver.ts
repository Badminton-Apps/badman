import { Injectable, PLATFORM_ID, TransferState, inject } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { EventCompetition } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { Apollo, gql } from 'apollo-angular';
import { first, map } from 'rxjs/operators';

export const EVENT_QUERY = gql`
  query EventCompetition($id: ID!) {
    eventCompetition(id: $id) {
      id
      name
      slug
      season
      openDate
      closeDate
      changeOpenDate
      changeCloseDate
      changeCloseRequestDate
      visualCode
      official
      lastSync
      contactEmail
      teamMatcher
      type
      state
      country
      checkEncounterForFilledIn
      meta {
        amountOfBasePlayers
      }
      exceptions {
        start
        end
        courts
      }
      infoEvents {
        start
        end
        name
        allowCompetition
      }
      subEventCompetitions {
        id
        name
        eventType
        level
        maxLevel
        minBaseIndex
        maxBaseIndex
        drawCompetitions {
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
      .query<{ eventCompetition: Partial<EventCompetition> }>({
        query: EVENT_QUERY,
        variables: {
          id: eventId,
        },
      })
      .pipe(
        transferState(`eventKey-${eventId}`, this.stateTransfer, this.platformId),
        map((result) => {
          if (!result?.data.eventCompetition) {
            throw new Error('No event found!');
          }
          return new EventCompetition(result.data.eventCompetition);
        }),
        first(),
      );
  }
}
