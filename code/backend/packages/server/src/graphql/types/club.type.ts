import { GraphQLObjectType } from 'graphql';
import { attributeFields } from 'graphql-sequelize';
import { Club } from '@badvlasim/shared/models';
import { getAttributeFields } from './attributes.type';

const ClubType = new GraphQLObjectType({
  name: 'Club',
  description: 'A Club',
  fields: () => Object.assign(getAttributeFields(Club), {})
});

export { ClubType };
