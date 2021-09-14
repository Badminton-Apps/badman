import {
  DataBaseHandler,
  RankingSystemGroup,
  logger,
  RankingSystem,
  GroupSystems,
  AuthenticatedUser,
  AuthenticatedRequest
} from '@badvlasim/shared';
import { Op } from 'sequelize';
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
  resolve: async (findOptions, { rankingSystem: rankingSystemInput }, context) => {
    if (context?.req?.user === null || !context.req.user.hasAnyPermission(['add:ranking'])) {
      logger.warn('User tried something it should\'t have done', {
        required: {
          anyClaim: ['add:ranking']
        },
        received: context?.req?.user?.permissions
      })
      throw new ApiError({
        code: 401,
        message: "You don't have permission to do this "
      });
    }

    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const { groups, ...rankingSystem } = rankingSystemInput;
      const eventDb = await RankingSystem.create(rankingSystem, { transaction });
      logger.debug('Event', eventDb.toJSON())
      logger.debug('Got groups', groups.map(r => r.id))


      for (const group of groups) {
        const dbGroup = await RankingSystemGroup.findByPk(group.id);
        await eventDb.addGroup(dbGroup, { transaction });
      }

      logger.debug('Added');

      await transaction.commit();
      return eventDb;
    } catch (e) {
      logger.warn('rollback', e);
      await  transaction.rollback();
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
    if (context?.req?.user === null || !context.req.user.hasAnyPermission(['edit:ranking'])) {
      logger.warn('User tried something it should\'t have done', {
        required: {
          anyClaim: ['edit:ranking']
        },
        received: context?.req?.user?.permissions
      })
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
      await GroupSystems.destroy({ where: { systemId: rankingSystem.id }, transaction });
      // Create new
      await GroupSystems.bulkCreate(
        rankingSystem.groups?.map(g => {
          return {
            systemId: rankingSystem.id,
            groupId: g.id
          };
        }),
        { transaction }
      );

      const dbEvent = await RankingSystem.findByPk(rankingSystem.id, {
        include: [{ model: RankingSystemGroup, attributes: ['id', 'name'] }],
        transaction
      });

      await transaction.commit();
      return dbEvent;
    } catch (e) {
      logger.error('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};
