import {
  DataBaseHandler,
  RankingSystemGroup,
  logger,
  RankingSystem,
  GroupSystems,
  AuthenticatedRequest,
  canExecute
} from '@badvlasim/shared';
import { RankingSystemInputType, RankingSystemType } from '../types';

export const addRankingSystemMutation = {
  type: RankingSystemType,
  args: {
    rankingSystem: {
      name: 'RankingSystem',
      type: RankingSystemInputType
    }
  },
  resolve: async (
    findOptions: { [key: string]: object },
    { rankingSystem: rankingSystemInput },
    context: { req: AuthenticatedRequest }
  ) => {
    canExecute(context?.req?.user, {
      anyPermissions: ['add:ranking']
    });

    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const { groups, ...rankingSystem } = rankingSystemInput;
      const eventDb = await RankingSystem.create(rankingSystem, { transaction });
      logger.debug('Event', eventDb.toJSON());
      logger.debug(
        'Got groups',
        groups.map((r) => r.id)
      );

      for (const group of groups) {
        const dbGroup = await RankingSystemGroup.findByPk(group.id);
        await eventDb.addGroup(dbGroup, { transaction });
      }

      logger.debug('Added');

      await transaction.commit();
      return eventDb;
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
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
  resolve: async (
    findOptions: { [key: string]: object },
    { rankingSystem },
    context: { req: AuthenticatedRequest }
  ) => {
    canExecute(context?.req?.user, { anyPermissions: ['edit:ranking']});

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
        rankingSystem.groups?.map((g) => {
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
