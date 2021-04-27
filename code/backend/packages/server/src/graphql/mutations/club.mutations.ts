import { Club, DataBaseHandler, logger, Player } from '@badvlasim/shared';
import { GraphQLBoolean, GraphQLID, GraphQLString } from 'graphql';
import { ApiError } from '../../models/api.error';
import { ClubInputType, ClubType } from '../types';

export const addClubMutation = {
  type: ClubType,
  args: {
    club: {
      name: 'Club',
      type: ClubInputType
    }
  },
  resolve: async (findOptions, { club }, context) => {
    if (context?.req?.user == null || !context.req.user.hasAnyPermission(['add:club'])) {
      logger.warn("User tried something it should't have done", {
        required: {
          anyClaim: ['add:club']
        },
        received: context?.req?.user?.permissions
      });
      throw new ApiError({
        code: 401,
        message: "You don't have permission to do this "
      });
    }
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const clubDb = await Club.create(club, { transaction });

      await transaction.commit();
      return clubDb;
    } catch (e) {
      logger.warn('rollback');
      await transaction.rollback();
      throw e;
    }
  }
};

export const removeClubMutation = {
  type: GraphQLBoolean,
  args: {
    id: {
      name: 'ClubId',
      type: GraphQLString
    }
  },
  resolve: async (findOptions, { id }, context) => {
    if (context?.req?.user == null || !context.req.user.hasAnyPermission(['remove:club'])) {
      logger.warn("User tried something it should't have done", {
        required: {
          anyClaim: ['remove:club']
        },
        received: context?.req?.user?.permissions
      });
      throw new ApiError({
        code: 401,
        message: "You don't have permission to do this "
      });
    }
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const clubDb = await Club.destroy({ where: { id: id }, transaction, cascade: true });

      await transaction.commit();
      return true;
    } catch (e) {
      logger.warn('rollback');
      await transaction.rollback();
      throw e;
    }
  }
};

export const addPlayerToClubMutation = {
  type: ClubType,
  args: {
    clubId: {
      name: 'clubId',
      type: GraphQLID
    },
    playerId: {
      name: 'playerId',
      type: GraphQLID
    }
  },
  resolve: async (findOptions, { clubId, playerId }, context) => {
    if (
      context?.req?.user == null ||
      !context.req.user.hasAnyPermission([`${clubId}_edit:club`, 'edit-any:club'])
    ) {
      logger.warn("User tried something it should't have done", {
        required: {
          anyClaim: [`${clubId}_edit:club`, 'edit-any:club']
        },
        received: context?.req?.user?.permissions
      });
      throw new ApiError({
        code: 401,
        message: "You don't have permission to do this "
      });
    }
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbClub = await Club.findByPk(clubId, {
        transaction
      });
      const dbPlayer = await Player.findByPk(playerId, {
        transaction
      });

      await dbClub.addPlayer(dbPlayer, {
        transaction,
        through: {
          start: new Date(),
          active: true
        }
      });

      await transaction.commit();
      return dbClub;
    } catch (e) {
      logger.warn('rollback');
      await transaction.rollback();
      throw e;
    }
  }
};

export const updateClubMutation = {
  type: ClubType,
  args: {
    club: {
      name: 'Club',
      type: ClubInputType
    }
  },
  resolve: async (findOptions, { club }, context) => {
    if (
      context?.req?.user == null ||
      !context.req.user.hasAnyPermission([`${club.id}_edit:club`, 'edit-any:club'])
    ) {
      logger.warn("User tried something it should't have done", {
        required: {
          anyClaim: ['edit-any:club'] // `${club.id}_edit:club`
        },
        received: context?.req?.user?.permissions
      });
      throw new ApiError({
        code: 401,
        message: "You don't have permission to do this "
      });
    }
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbClub = await Club.findByPk(club.id, { transaction });
      if (!dbClub) {
        logger.debug('club', dbClub);
        throw new ApiError({
          code: 404,
          message: 'Club not found'
        });
      }

      await dbClub.update(club, {
        transaction
      });

      await transaction.commit();
      return dbClub;
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};
