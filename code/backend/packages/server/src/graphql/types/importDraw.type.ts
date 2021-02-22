import { ImportDraw } from '@badvlasim/shared/models';
import { GraphQLInt, GraphQLObjectType } from 'graphql';
import { createConnection } from 'graphql-sequelize';
import { getAttributeFields } from './attributes.type';

export const ImportDrawType = new GraphQLObjectType({
  name: 'ImportDraw',
  description: 'A Imported subevent',
  fields: () => Object.assign(getAttributeFields(ImportDraw), {})
});

export const ImportDrawConnectionType = createConnection({
  name: 'ImportDraw',
  nodeType: ImportDrawType,
  target: ImportDraw,
  connectionFields: {
    total: {
      type: GraphQLInt,
      resolve: ({ fullCount }) => fullCount
    }
  }
});
