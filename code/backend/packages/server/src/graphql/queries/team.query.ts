import { Team } from '@badvlasim/shared';
import { GraphQLID, GraphQLList, GraphQLNonNull } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { queryFixer } from '../queryFixer';
import { TeamType } from '../types';

export const teamsQuery = {
  type: new GraphQLList(TeamType),
  args: Object.assign(defaultListArgs()),
  resolve: resolver(Team, {
    before: async (findOptions: { [key: string]: object }) => {
      findOptions = {
        ...findOptions,
        where: queryFixer(findOptions.where)
      };
      return findOptions;
    }
  })
};

export const teamQuery = {
  type: TeamType,
  args: {
    id: {
      description: 'Id of the team',
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  resolve: resolver(Team, {
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
