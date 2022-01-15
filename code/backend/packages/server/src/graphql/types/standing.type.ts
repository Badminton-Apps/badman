import { Standing } from '@badvlasim/shared';
import { GraphQLInputObjectType, GraphQLObjectType } from 'graphql';
import { resolver } from 'graphql-sequelize';
import { EntryType } from '.';
import { getAttributeFields } from './attributes.type';

export const StandingType = new GraphQLObjectType({
  name: 'Standing',
  description: 'A Standing',
  fields: () =>
    Object.assign(getAttributeFields(Standing), {
      entry: {
        type: EntryType,
        resolve: resolver(Standing.associations.entry)
      }
    })
});

export const StandingInputType = new GraphQLInputObjectType({
  name: 'StandingInput',
  description: 'This represents a StandingInputType',
  fields: () =>
    Object.assign(
      getAttributeFields(Standing, {
        exclude: ['createdAt', 'updatedAt'],
        optionalString: ['id']
      })
    )
});
