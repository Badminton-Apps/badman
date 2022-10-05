import { gql } from 'apollo-angular';

export const UpdateComment = gql`
  mutation UpdateComment($data: CommentUpdateInput!) {
    updateComment(data: $data) {
      id
    }
  }
`;
