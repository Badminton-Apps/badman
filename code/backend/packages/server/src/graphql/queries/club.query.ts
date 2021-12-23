import { Club } from '@badvlasim/shared';
import { GraphQLID, GraphQLNonNull } from 'graphql';
import { resolver } from 'graphql-sequelize';
import { queryFixer } from '../queryFixer';
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
  resolve: resolver(Club, {
    before: async (findOptions: { [key: string]: unknown }) => {
      if (findOptions.where?.['id']) {
        findOptions.where = {
          $or: [{ id: findOptions.where?.['id'] }, { slug: findOptions.where?.['id'] }]
        };
      }

      findOptions = {
        where: queryFixer(findOptions.where)
      };
      return findOptions;
    }
  })
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
