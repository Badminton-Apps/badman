import { DrawCompetition } from '@badvlasim/shared';
import { GraphQLID, GraphQLList, GraphQLNonNull } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { queryFixer } from '../queryFixer';
import { DrawCompetitionType } from '../types';

export const competitionDrawsQuery = {
  type: new GraphQLList(DrawCompetitionType),
  args: Object.assign(defaultListArgs()),
  resolve: resolver(DrawCompetition, {
    before: async (findOptions: { [key: string]: object }) => {
      findOptions = {
        ...findOptions,
        where: queryFixer(findOptions.where)
      };
      return findOptions;
    }
  })
};

export const competitionDrawQuery = {
  type: DrawCompetitionType,
  args: {
    id: {
      description: 'Id of the location',
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  resolve: resolver(DrawCompetition)
};
