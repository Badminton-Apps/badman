import { Location } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { of } from 'rxjs';
import { map } from 'rxjs/operators';

export const loadLocations = (apollo: Apollo, clubId?: string | null, season?: number | null) => {
  if (!clubId || !season) {
    console.error('No clubId or season provided');
    return of([]);
  }

  return apollo
    .query<{ locations: Location[] }>({
      query: gql`
        query Locations($where: JSONObject, $availibilitiesWhere: JSONObject) {
          locations(where: $where) {
            id
            name
            address
            street
            streetNumber
            postalcode
            city
            state
            phone
            fax
            availibilities(where: $availibilitiesWhere) {
              id
              season
              days {
                day
                startTime
                endTime
                courts
              }
              exceptions {
                start
                end
                courts
              }
            }
          }
        }
      `,
      variables: {
        where: {
          clubId: clubId,
        },
        availibilitiesWhere: {
          season: {
            $or: [season, season - 1],
          },
        },
      },
    })
    .pipe(map((result) => result.data?.locations?.map((location) => new Location(location))));
};
