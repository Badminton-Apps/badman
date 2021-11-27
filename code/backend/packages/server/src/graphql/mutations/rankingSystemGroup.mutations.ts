import { RankingSystemGroup, logger, AuthenticatedRequest } from '@badvlasim/shared';
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
  resolve: async (
    findOptions: { [key: string]: object },
    { rankingSystemGroup },
    context: { req: AuthenticatedRequest }
  ) => {
    if (context?.req?.user === null || !context.req.user.hasAnyPermission(['add:ranking-group'])) {
      logger.warn("User tried something it should't have done", {
        required: {
          anyClaim: ['add:ranking-group']
        },
        received: context?.req?.user?.permissions
      });
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
  resolve: async (
    findOptions: { [key: string]: object },
    { id, rankingSystemGroup },
    context: { req: AuthenticatedRequest }
  ) => {
    if (context?.req?.user === null || !context.req.user.hasAnyPermission(['edit:ranking-group'])) {
      logger.warn("User tried something it should't have done", {
        required: {
          anyClaim: ['edit:ranking-group']
        },
        received: context?.req?.user?.permissions
      });
      throw new ApiError({
        code: 401,
        message: "You don't have permission to do this "
      });
    }

    logger.debug('TO IMPLEMENT', id, rankingSystemGroup);
    // return await RankingSystemGroup.create(rankingSystemGroup);
    return null;
  }
};
