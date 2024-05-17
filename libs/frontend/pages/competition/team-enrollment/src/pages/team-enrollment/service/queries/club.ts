import { Club } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { map } from 'rxjs/operators';

export const loadClub = (apollo: Apollo, id?: string | null) => {
  return apollo
    .query<{
      club: Club;
    }>({
      query: gql`
        query Club($id: ID!) {
          club(id: $id) {
            id
            name
            state
            slug
            teamName
            useForTeamName
          }
        }
      `,
      variables: {
        id: id ?? null,
      },
    })
    .pipe(map((res) => new Club(res.data?.club)));
};
