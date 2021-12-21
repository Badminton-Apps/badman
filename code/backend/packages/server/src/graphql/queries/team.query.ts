import { Team } from '@badvlasim/shared';
import { GraphQLID, GraphQLList, GraphQLNonNull } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { queryFixer } from '../queryFixer';
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
    before: async (findOptions: { [key: string]: object }, args: { [key: string]: object }) => {
      findOptions.where = {
        ...queryFixer(findOptions.where),
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
