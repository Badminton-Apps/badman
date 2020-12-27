import { RankingSystemGroup } from '@badvlasim/shared';
import { GraphQLInt } from 'graphql';
import { ApiError } from '../../models/api.error';
import { RankingSystemGroupInputType, RankingSystemGroupType } from '../types';

export const addRankingSystemGroupMutation = {
  type: RankingSystemGroupType,
  args: {
    rankingSystemGroup: {
      name: 'RankingSystemGroup',
      type: RankingSystemGroupInputType
    }
  },
  resolve: async (findOptions, { rankingSystemGroup }, context) => {
    if (!context.req.user.hasAnyPermission(['add:ranking-group'])) {
      throw new ApiError({
        code: 401,
        message: "You don't have permission to do this "
      });
    }
    return RankingSystemGroup.create(rankingSystemGroup);
  }
};

export const updateRankingSystemGroupMutation = {
  type: RankingSystemGroupType,
  args: {
    id: {
      name: 'Id',
      type: GraphQLInt
    },
    rankingSystemGroup: {
      name: 'RankingSystemGroup',
      type: RankingSystemGroupInputType
    }
  },
  resolve: async (findOptions, { id, rankingSystemGroup }, context) => {
    if (!context.req.user.hasAnyPermission(['edit:ranking-group'])) {
      throw new ApiError({
        code: 401,
        message: "You don't have permission to do this "
      });
    }
    
    // return await RankingSystemGroup.create(rankingSystemGroup);
    return null;
  }
};
