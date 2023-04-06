import { isPlatformServer } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { makeStateKey, TransferState } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { EncounterCompetition } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { of } from 'rxjs';
import { first, map, tap } from 'rxjs/operators';

@Injectable()
export class EncounterResolver implements Resolve<EncounterCompetition | null> {
  constructor(
    private apollo: Apollo,
    private transferState: TransferState,
    @Inject(PLATFORM_ID) private platformId: string
  ) {}

  resolve(route: ActivatedRouteSnapshot) {
    const encounterId = route.params['id'];

    const STATE_KEY = makeStateKey<EncounterCompetition>(
      'encounterKey-' + encounterId
    );

    if (this.transferState.hasKey(STATE_KEY)) {
      const eventCompetition = this.transferState.get(
        STATE_KEY,
        null
      ) as Partial<EncounterCompetition>;

      this.transferState.remove(STATE_KEY);

      if (eventCompetition) {
        return of(new EncounterCompetition(eventCompetition));
      }

      return of(null);
    } else {
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
              }
            }
          `,
          variables: {
            id: encounterId,
          },
        })
        .pipe(
          map((result) => {
            if (!result.data.encounterCompetition) {
              throw new Error('No encounter found!');
            }
            return new EncounterCompetition(result.data.encounterCompetition);
          }),
          tap((encounterCompetition) => {
            if (isPlatformServer(this.platformId)) {
              this.transferState.set(STATE_KEY, encounterCompetition);
            }
          }),
          first()
        );
    }
  }
}
