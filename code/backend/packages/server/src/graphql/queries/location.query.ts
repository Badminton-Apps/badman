import { Location } from '@badvlasim/shared/models';
import { GraphQLID, GraphQLList, GraphQLNonNull } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { LocationType } from '../types';


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