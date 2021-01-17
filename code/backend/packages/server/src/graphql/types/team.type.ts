import { Team } from '@badvlasim/shared/models';
import { GraphQLInputObjectType, GraphQLObjectType } from 'graphql';
import { getAttributeFields } from './attributes.type';

export const TeamType = new GraphQLObjectType({
  name: 'Team',
  description: 'A Team',
  fields: () => Object.assign(getAttributeFields(Team), {})
});

export const TeamInputType = new GraphQLInputObjectType({
  name: 'TeamInput',
  description: 'This represents a TeamnputType',
  fields: () => Object.assign(getAttributeFields(Team, true))
});
