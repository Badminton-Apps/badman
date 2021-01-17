import { Club, DataBaseHandler, logger, Player } from '@badvlasim/shared';
import { GraphQLID, GraphQLInt } from 'graphql';
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
    if (!context.req.user.hasAnyPermission(['add:club'])) {
      throw new ApiError({
        code: 401,
        message: "You don't have permission to do this "
      });
    }
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const clubDb = await Club.create(
        {
          ...club,
          id: null
        },
        { transaction }
      );

      transaction.commit();
      return clubDb;
    } catch (e) {
      logger.warn('rollback');
      transaction.rollback();
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
    if (!context.req.user.hasAnyPermission(['edit:club'])) {
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

      transaction.commit();
      return dbClub;
    } catch (e) {
      logger.warn('rollback');
      transaction.rollback();
      throw e;
    }
  }
};

export const updateClubMutation = {
  type: ClubType,
  args: {
    id: {
      name: 'Id',
      type: GraphQLID
    },
    club: {
      name: 'Club',
      type: ClubInputType
    }
  },
  resolve: async (findOptions, { id, club }, context) => {
    if (!context.req.user.hasAnyPermission(['edit:club'])) {
      throw new ApiError({
        code: 401,
        message: "You don't have permission to do this "
      });
    }
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      await Club.update(club, {
        where: { id: club.id },
        transaction
      });

      transaction.commit();
    } catch (e) {
      logger.warn('rollback');
      transaction.rollback();
      throw e;
    }
  }
};
