import { Location } from '@badvlasim/shared/models';
import { GraphQLID, GraphQLList, GraphQLNonNull } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { queryFixer } from '../queryFixer';
import { LocationType } from '../types';

export const locationsQuery = {
  type: new GraphQLList(LocationType),
  args: Object.assign(defaultListArgs()),
  resolve: resolver(Location, {
    before: async (findOptions, args, context, info) => {
      findOptions = {
        ...findOptions,
        where: queryFixer(findOptions.where)
      };
      return findOptions;
    }
  })
};

export const locationQuery = {
  type: LocationType,
  args: {
    id: {
      description: 'Id of the location',
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  resolve: resolver(Location)
};