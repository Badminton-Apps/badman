import { Club } from '@badvlasim/shared/models';
import { GraphQLID, GraphQLNonNull } from 'graphql';
import { resolver } from 'graphql-sequelize';
import { ClubConnectionType, ClubType } from '../types/club.type';
import { where } from './utils';

export const clubQuery = {
  type: ClubType,
  args: {
    id: {
      description: 'id of the club',
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  resolve: resolver(Club)
};

export const clubsQuery = {
  type: ClubConnectionType.connectionType,
  args: {
    ...ClubConnectionType.connectionArgs,
    where
  },
  resolve: (...args) => {
    return ClubConnectionType.resolve(...args);
  }
};
