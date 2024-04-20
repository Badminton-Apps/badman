import { EventCompetition } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { of } from 'rxjs';
import { map } from 'rxjs/operators';

export const loadEvents = (apollo: Apollo, state?: string | null) => {
  if (!state) {
    console.error('No clubId or season provided');
    return of([]);
  }

  return apollo
    .query<{
      eventCompetitions: {
        count: number;
        rows: Partial<EventCompetition>[];
      };
    }>({
      query: gql`
        query EventCompetition($where: JSONObject) {
          eventCompetitions(where: $where) {
            count
            rows {
              id
              type
              state
              name
              subEventCompetitions {
                id
                name
                eventType
                level
                maxLevel
                minBaseIndex
                maxBaseIndex
                __typename
              }
              __typename
            }
            __typename
          }
        }
      `,
      variables: {
        where: {
          openDate: { $lte: new Date().toISOString() },
          closeDate: { $gte: new Date().toISOString() },
          $or: [{ type: 'LIGA' }, { type: 'PROV', state: state }, { type: 'NATIONAL' }],
        },
      },
    })
    .pipe(
      map((result) => result.data.eventCompetitions?.rows?.map((e) => new EventCompetition(e))),
    );
};
