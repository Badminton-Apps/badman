import { GraphQLEnumType, GraphQLInputObjectType, GraphQLInt, GraphQLObjectType } from 'graphql';
import { Club } from '@badvlasim/shared/models';
import { getAttributeFields } from './attributes.type';
import { createConnection, defaultListArgs, resolver } from 'graphql-sequelize';
import { queryFixer } from '../queryFixer';

export const ClubType = new GraphQLObjectType({
  name: 'Club',
  description: 'A Club',
  fields: () => Object.assign(getAttributeFields(Club), {})
});

export const ClubInputType = new GraphQLInputObjectType({
  name: 'ClubInput',
  description: 'This represents a ClubnputType',
  fields: () => Object.assign(getAttributeFields(Club, true))
});

export const ClubConnectionType = createConnection({
  name: 'Club',
  nodeType: ClubType,
  target: Club,
  connectionFields: {
    total: {
      type: GraphQLInt,
      resolve: ({ fullCount }) => fullCount
    }
  },
  where: (key, value, currentWhere) => {
    if (key === 'where') {
      return queryFixer(value);
    } else {
      return { [key]: value };
    }
  }
});
