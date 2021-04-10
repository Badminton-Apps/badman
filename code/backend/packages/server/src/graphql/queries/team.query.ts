import { Team } from '@badvlasim/shared/models';
import { GraphQLID, GraphQLList, GraphQLNonNull } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { TeamType } from '../types';

export const teamsQuery = {
  type: new GraphQLList(TeamType),
  args: Object.assign(defaultListArgs(), {
    clubId: {
      description: 'id of the club',
      type: new GraphQLNonNull(GraphQLID)
    }
  }),
  resolve: resolver(Team, {
    before: async (findOptions, args, context, info) => {
      // info.cacheControl.setCacheHint({ maxAge: 6000, scope: 'PRIVATE' });
      findOptions.where = {
        clubId: args.clubId
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
  resolve: resolver(Team)
};
