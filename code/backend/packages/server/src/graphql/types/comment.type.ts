import { Comment } from '@badvlasim/shared/models';
import { GraphQLInputObjectType, GraphQLObjectType } from 'graphql';
import { getAttributeFields } from './attributes.type';

export const CommentType = new GraphQLObjectType({
  name: 'Comment',
  description: 'A Comment',
  fields: () => Object.assign(getAttributeFields(Comment), {})
});

export const CommentInputType = new GraphQLInputObjectType({
  name: 'CommentInput',
  description: 'This represents a CommentnputType',
  fields: () =>
    Object.assign(
      getAttributeFields(Comment, { exclude: ['createdAt', 'updatedAt'], optionalString: ['id'] })
    )
});
