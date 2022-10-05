import { gql } from 'apollo-angular';

export const AddComment = gql`
  mutation AddComment($data: CommentNewInput!) {
    addComment(data: $data) {
      id
    }
  }
`;
