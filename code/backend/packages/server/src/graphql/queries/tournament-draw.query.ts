import { DrawTournament } from '@badvlasim/shared';
import { GraphQLID, GraphQLList, GraphQLNonNull } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { queryFixer } from '../queryFixer';
import { DrawTournamentType } from '../types';

export const tournamentDrawsQuery = {
  type: new GraphQLList(DrawTournamentType),
  args: Object.assign(defaultListArgs()),
  resolve: resolver(DrawTournament, {
    before: async (findOptions: { [key: string]: object }) => {
      findOptions = {
        ...findOptions,
        where: queryFixer(findOptions.where)
      };
      return findOptions;
    }
  })
};

export const tournamentDrawQuery = {
  type: DrawTournamentType,
  args: {
    id: {
      description: 'Id of the location',
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  resolve: resolver(DrawTournament)
};
