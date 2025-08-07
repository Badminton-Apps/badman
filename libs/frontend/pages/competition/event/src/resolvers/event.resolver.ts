import { Injectable, PLATFORM_ID, TransferState, inject } from "@angular/core";
import { ActivatedRouteSnapshot } from "@angular/router";
import { EventCompetition } from "@badman/frontend-models";
import { transferState } from "@badman/frontend-utils";
import { Apollo, gql } from "apollo-angular";
import { first, map } from "rxjs/operators";
import { EVENT_QUERY } from "../queries";

@Injectable()
export class EventResolver {
  private apollo = inject(Apollo);
  private stateTransfer = inject(TransferState);
  private platformId = inject<string>(PLATFORM_ID);

  resolve(route: ActivatedRouteSnapshot) {
    const eventId = route.params["id"];

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
            throw new Error("No event found!");
          }
          return new EventCompetition(result.data.eventCompetition);
        })
      );
  }
}
