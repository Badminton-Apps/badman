import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString
} from 'graphql';
import { attributeFields, createConnection, defaultListArgs, resolver } from 'graphql-sequelize';
import { col, fn, Includeable, Op, or, QueryTypes, where } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { ImporterFile } from '@badvlasim/shared/models';
import { ImportedSubEventType } from './importSubEvent.type';
import { getAttributeFields } from './attributes.type';

const ImportedType = new GraphQLObjectType({
  name: 'Imported',
  description: 'A Imported',
  fields: () =>
    Object.assign(getAttributeFields(ImporterFile), {
      subEvents: {
        type: new GraphQLList(ImportedSubEventType),
        args: Object.assign(defaultListArgs(), {}),
        resolve: resolver(ImporterFile.associations.subEvents)
      }
    })
});

const ImportedConnectionType = createConnection({
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

const ImportInputType = new GraphQLInputObjectType({
  name: 'ImportInput',
  description: 'This represents a UserInputType',
  fields: () => Object.assign(getAttributeFields(ImporterFile, { exclude: ['createdAt', 'updatedAt'], optionalString: ['id'] }), {})
});


export { ImportedType, ImportedConnectionType, ImportInputType };
