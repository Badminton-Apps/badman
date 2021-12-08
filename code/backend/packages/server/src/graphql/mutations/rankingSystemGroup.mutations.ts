import { RankingSystemGroup, logger, AuthenticatedRequest, canExecute } from '@badvlasim/shared';
import { GraphQLInt } from 'graphql';
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
    canExecute(context?.req?.user, {
      anyPermissions: ['add:ranking-group']
    });

  
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
    canExecute(context?.req?.user, { anyPermissions: ['edit:ranking-group']});



    logger.debug('TO IMPLEMENT', id, rankingSystemGroup);
    // return await RankingSystemGroup.create(rankingSystemGroup);
    return null;
  }
};
