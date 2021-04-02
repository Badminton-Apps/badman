import { ImporterFile } from '@badvlasim/shared/models';
import {
  GraphQLEnumType,

  GraphQLInputObjectType,
  GraphQLInt,


  GraphQLObjectType
} from 'graphql';
import { createConnection } from 'graphql-sequelize';
import { getAttributeFields } from './attributes.type';

export const ImportedType = new GraphQLObjectType({
  name: 'Imported',
  description: 'A Imported',
  fields: () => Object.assign(getAttributeFields(ImporterFile), {})
});

export const ImportedConnectionType = createConnection({
  name: 'Imported',
  nodeType: ImportedType,
  target: ImporterFile,
  connectionFields: {
    total: {
      type: GraphQLInt,
      resolve: ({ fullCount }) => fullCount
    }
  },
  orderBy: new GraphQLEnumType({
    name: 'ImportedOrderBy',
    values: {
      DATE_ASC: { value: ['firstDay', 'ASC'] }, // The first ENUM value will be the default order. The direction will be used for `first`, will automatically be inversed for `last` lookups.
      DATE_DESC: { value: ['firstDay', 'DESC'] }
    }
  })
});

export const ImportInputType = new GraphQLInputObjectType({
  name: 'ImportInput',
  description: 'This represents a UserInputType',
  fields: () =>
    Object.assign(
      getAttributeFields(ImporterFile, {
        exclude: ['createdAt', 'updatedAt'],
        optionalString: ['id']
      }),
      {}
    )
});
