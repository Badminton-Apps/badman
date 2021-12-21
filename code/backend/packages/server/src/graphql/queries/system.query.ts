import { RankingSystem, RankingSystemGroup } from '@badvlasim/shared';
import { GraphQLID, GraphQLList, GraphQLNonNull } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
import { queryFixer } from '../queryFixer';
import { RankingSystemGroupType, RankingSystemType } from '../types';

export const systemsQuery = {
  type: new GraphQLList(RankingSystemType),
  args: Object.assign(defaultListArgs(), {}),
  resolve: resolver(RankingSystem)
};
export const systemQuery = {
  type: RankingSystemType,
  args: {
    id: {
      description: 'Id of the system',
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  resolve: resolver(RankingSystem, {
    before: async (findOptions: { [key: string]: object }) => {
      findOptions = {
        ...findOptions,
        where: queryFixer(findOptions.where)
      };
      return findOptions;
    }
  })
};

export const systemsGroupsQuery = {
  type: new GraphQLList(RankingSystemGroupType),
  args: Object.assign(defaultListArgs(), {}),
  resolve: resolver(RankingSystemGroup, {
    before: async (findOptions: { [key: string]: object }) => {
      findOptions = {
        ...findOptions,
        where: queryFixer(findOptions.where)
      };
      return findOptions;
    }
  })
};
