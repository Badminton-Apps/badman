import {
  DataBaseHandler,
  RankingSystemGroup,
  logger,
  RankingSystem,
  GroupSystems,
  AuthenticatedUser,
  AuthenticatedRequest
} from '@badvlasim/shared';
import { ApiError } from '../../models/api.error';
import { RankingSystemInputType, RankingSystemType } from '../types';

export const addRankingSystemMutation = {
  type: RankingSystemType,
  args: {
    rankingSystem: {
      name: 'RankingSystem',
      type: RankingSystemInputType
    }
  },
  resolve: async (findOptions, { rankingSystem }, context) => {
    if (!context.req.user.hasAnyPermission(['add:ranking'])) {
      throw new ApiError({
        code: 401,
        message: "You don't have permission to do this "
      });
    }

    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const eventDb = await RankingSystem.create(rankingSystem, { transaction });

      logger.debug('Added');

      transaction.commit();
      return eventDb;
    } catch (e) {
      logger.warn('rollback');
      transaction.rollback();
      throw e;
    }
  }
};

export const updateRankingSystemMutation = {
  type: RankingSystemType,
  args: {
    rankingSystem: {
      name: 'RankingSystem',
      type: RankingSystemInputType
    }
  },
  resolve: async (findOptions, { rankingSystem }, context) => {
    if (!context.req.user.hasAnyPermission(['edit:ranking'])) {
      throw new ApiError({
        code: 401,
        message: "You don't have permission to do this "
      });
    }
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      await RankingSystem.update(rankingSystem, {
        where: { id: rankingSystem.id },
        transaction
      });

      // Destroy existing
      await GroupSystems.destroy({ where: { SystemId: rankingSystem.id }, transaction });
      // Create new
      await GroupSystems.bulkCreate(
        rankingSystem.groups?.map(g => {
          return {
            SystemId: rankingSystem.id,
            GroupId: g.id
          };
        }),
        { transaction }
      );

      const dbEvent = await RankingSystem.findByPk(rankingSystem.id, {
        include: [{ model: RankingSystemGroup, attributes: ['id', 'name'] }],
        transaction
      });

      transaction.commit();
      return dbEvent;
    } catch (e) {
      logger.warn('rollback');
      transaction.rollback();
      throw e;
    }
  }
};
