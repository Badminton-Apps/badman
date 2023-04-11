import { isPlatformServer } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { makeStateKey, TransferState } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { EventCompetition } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { of } from 'rxjs';
import { first, map, tap } from 'rxjs/operators';

@Injectable()
export class EventResolver implements Resolve<EventCompetition | null> {
  constructor(
    private apollo: Apollo,
    private transferState: TransferState,
    @Inject(PLATFORM_ID) private platformId: string
  ) {}

  resolve(route: ActivatedRouteSnapshot) {
    const eventId = route.params['id'];

    const STATE_KEY = makeStateKey<EventCompetition>('eventKey-' + eventId);

    if (this.transferState.hasKey(STATE_KEY)) {
      const eventCompetition = this.transferState.get(
        STATE_KEY,
        null
      ) as Partial<EventCompetition>;

      this.transferState.remove(STATE_KEY);

      if (eventCompetition) {
        return of(new EventCompetition(eventCompetition));
      }

      return of(null);
    } else {
      return this.apollo
        .query<{ eventCompetition: Partial<EventCompetition> }>({
          query: gql`
            query EventCompetition($id: ID!) {
              eventCompetition(id: $id) {
                id
                name
                slug
                startYear
                openDate
                closeDate
                visualCode
                lastSync
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
          `,
          variables: {
            id: eventId,
          },
        })
        .pipe(
          map((result) => {
            if (!result.data.eventCompetition) {
              throw new Error('No event found!');
            }
            return new EventCompetition(result.data.eventCompetition);
          }),
          tap((eventCompetition) => {
            if (isPlatformServer(this.platformId)) {
              this.transferState.set(STATE_KEY, eventCompetition);
            }
          }),
          first()
        );
    }
  }
}
