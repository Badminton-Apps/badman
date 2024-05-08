import { Club, ClubPlayer } from '@badman/frontend-models';
import { startOfSeason } from '@badman/utils';
import { Apollo, gql } from 'apollo-angular';
import { of } from 'rxjs';
import { map } from 'rxjs/operators';

export const loadTransersAndLoans = (apollo: Apollo, clubId?: string | null, season?: number) => {
  if (!clubId) {
    console.error('No clubId or season provided');
    return of([]);
  }

  if (!season) {
    console.error('No season provided');
    return of([]);
  }

  return apollo
    .query<{ club: Partial<Club> }>({
      fetchPolicy: 'network-only',
      query: gql`
        query GetLoansAndTransfersForSeason${season}($id: ID!, $active: Boolean, $where: JSONObject) {
          club(id: $id) {
            id
            players(active: $active, where: $where) {
              id
              fullName
              clubMembership {
                id
                membershipType
                confirmed
              }
            }
          }
        }
      `,
      variables: {
        id: clubId,
        active: false,
        where: {
          '$ClubPlayerMembership.start$': {
            $gte: startOfSeason(season),
          },
          '$ClubPlayerMembership.end$': null,
        },
      },
    })
    .pipe(
      map((result) => (result?.data?.club?.players ?? [])?.map((player) => new ClubPlayer(player))),
    );
};
