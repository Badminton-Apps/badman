import { GraphQLObjectType } from 'graphql';
import { attributeFields } from 'graphql-sequelize';
import { Team } from '@badvlasim/shared/models';
import { getAttributeFields } from './attributes.type';

const TeamType = new GraphQLObjectType({
  name: 'Team',
  description: 'A Team',
  fields: () => Object.assign(getAttributeFields(Team), {})
});

export { TeamType };
 