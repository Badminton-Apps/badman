import { isPlatformServer } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { makeStateKey, TransferState } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { EventTournament } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { of } from 'rxjs';
import { first, map, tap } from 'rxjs/operators';

@Injectable()
export class EventResolver implements Resolve<EventTournament | null> {
  constructor(
    private apollo: Apollo,
    private transferState: TransferState,
    @Inject(PLATFORM_ID) private platformId: string
  ) {}

  resolve(route: ActivatedRouteSnapshot) {
    const eventId = route.params['id'];

    const STATE_KEY = makeStateKey<EventTournament>('eventKey-' + eventId);

    if (this.transferState.hasKey(STATE_KEY)) {
      const eventTournament = this.transferState.get(
        STATE_KEY,
        null
      ) as Partial<EventTournament>;

      this.transferState.remove(STATE_KEY);

      if (eventTournament) {
        return of(new EventTournament(eventTournament));
      }

      return of(null);
    } else {
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
          map((result) => {
            if (!result.data.eventTournament) {
              throw new Error('No event found!');
            }
            return new EventTournament(result.data.eventTournament);
          }),
          tap((eventTournament) => {
            if (isPlatformServer(this.platformId)) {
              this.transferState.set(STATE_KEY, eventTournament);
            }
          }),
          first()
        );
    }
  }
}
