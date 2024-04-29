import { Comment } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { of } from 'rxjs';
import { map } from 'rxjs/operators';

export const loadComments = (apollo: Apollo, clubId?: string | null, eventIds?: string[]) => {
  if (!clubId || !eventIds) {
    console.error('No clubId or season provided');
    return of([]);
  }

  return apollo
    .query<{ comments: Partial<Comment[]> }>({
      fetchPolicy: 'network-only',
      query: gql`
        query Comments($where: JSONObject) {
          comments(where: $where) {
            id
            linkType
            linkId
            message
          }
        }
      `,
      variables: {
        where: {
          linkType: 'competition',
          linkId: eventIds,
          clubId,
        },
      },
    })
    .pipe(map((result) => (result?.data?.comments ?? []) as Partial<Comment>[]));
};
