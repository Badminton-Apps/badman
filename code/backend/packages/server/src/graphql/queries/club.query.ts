import { GraphQLEnumType, GraphQLID, GraphQLList, GraphQLNonNull } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { Club } from '@badvlasim/shared/models';
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
