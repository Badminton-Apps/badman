import { RankingSystem, RankingSystemGroup } from '@badvlasim/shared/models';
import { GraphQLID, GraphQLList, GraphQLNonNull, GraphQLString } from 'graphql';
import { defaultListArgs, resolver } from 'graphql-sequelize';
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
  resolve: resolver(RankingSystem)
};

export const systemsGroupsQuery = {
  type: new GraphQLList(RankingSystemGroupType),
  args: Object.assign(defaultListArgs(), {}),
  resolve: resolver(RankingSystemGroup)
};
