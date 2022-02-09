import {
  AuthenticatedRequest,
  canExecute,
  DataBaseHandler,
  DrawCompetition,
  DrawTournament,
  EncounterCompetition,
  Game,
  GamePlayer,
  GroupSystems,
  logger,
  Player,
  RankingPlace,
  getSystemCalc,
  RankingSystem,
  RankingSystemGroup,
  StartVisualRankingDate,
  SubEventCompetition,
  SubEventTournament,
  ApiError
} from '@badvlasim/shared';
import { Op } from 'sequelize';
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
      const systemDb = await RankingSystem.create(rankingSystem, { transaction });

      for (const group of groups) {
        const dbGroup = await RankingSystemGroup.findByPk(group.id);
        await systemDb.addGroup(dbGroup, { transaction });
      }

      await transaction.commit();
      return systemDb;
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
    canExecute(context?.req?.user, { anyPermissions: ['edit:ranking'] });

    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbSystem = await RankingSystem.findByPk(rankingSystem.id);
      if (!dbSystem) {
        throw new ApiError({
          code: 404,
          message: 'System not found'
        });
      }

      // New system is now primary
      if (rankingSystem.primary == true) {
        // Set other systems to false
        await RankingSystem.update(
          { primary: false },
          {
            where: {
              primary: true
            },
            transaction
          }
        );
      }

      // Update system
      await dbSystem.update(rankingSystem, {
        transaction
      });

      if ((rankingSystem.groups?.length ?? 0) > 0) {
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
      }

      const dbEvent = await RankingSystem.findByPk(rankingSystem.id, {
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
