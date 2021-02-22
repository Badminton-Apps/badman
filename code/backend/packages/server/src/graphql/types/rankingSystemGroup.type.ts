import { RankingSystemGroup } from '@badvlasim/shared/models';
import { GraphQLInputObjectType, GraphQLObjectType } from 'graphql';
import { getAttributeFields } from './attributes.type';

export const RankingSystemGroupType = new GraphQLObjectType({
  name: 'RankingSystemGroup',
  description: 'A RankingSystemGroup',
  fields: () => Object.assign(getAttributeFields(RankingSystemGroup), {})
});

export const RankingSystemGroupInputType = new GraphQLInputObjectType({
  name: 'RankingSystemGroupInput',
  description: 'This represents a RankingSystemGroupInput',
  fields: () => Object.assign(getAttributeFields(RankingSystemGroup, { exclude: ['createdAt', 'updatedAt'], optionalString: ['id'] }), {})
});
