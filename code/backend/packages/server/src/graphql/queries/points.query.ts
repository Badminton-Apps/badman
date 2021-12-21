import { RankingPoint } from '@badvlasim/shared';
import { GraphQLList } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { queryFixer } from '../queryFixer';
import { RankingPointType } from '../types';

export const pointsQuery = {
  type: new GraphQLList(RankingPointType),
  args: Object.assign(defaultListArgs(), {}),
  resolve: resolver(RankingPoint, {
    before: async (findOptions: { [key: string]: object }) => {
      findOptions = {
        ...findOptions,
        where: queryFixer(findOptions.where)
      };
      return findOptions;
    }
  })
};
