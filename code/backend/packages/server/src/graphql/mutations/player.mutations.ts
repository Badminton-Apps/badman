import { RankingPlace } from './../../../../_shared/models/sequelize/ranking/place.model';
import { DataBaseHandler, logger, Player } from '@badvlasim/shared';
import { GraphQLID, GraphQLInt } from 'graphql';
import { ApiError } from '../../models/api.error';
import { PlayerInputType, PlayerType, RankingPlaceInputType, RankingPlaceType } from '../types';

export const addPlayerMutation = {
  type: PlayerType,
  args: {
    player: {
      name: 'Player',
      type: PlayerInputType
    }
  },
  resolve: async (findOptions, { player }, context) => {
    if (context?.req?.user == null || !context.req.user.hasAnyPermission(['add:player'])) {
      logger.warn("User tried something it should't have done", {
        required: {
          anyClaim: ['add:player']
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
      const playerDb = await Player.create(player, { transaction });

      await transaction.commit();
      return playerDb;
    } catch (e) {
      logger.warn('rollback');
      await transaction.rollback();
      throw e;
    }
  }
};

export const updatePlayerMutation = {
  type: PlayerType,
  args: {
    player: {
      name: 'Player',
      type: PlayerInputType
    }
  },
  resolve: async (findOptions, { player }, context) => {
    if (
      context?.req?.user == null ||
      !context.req.user.hasAnyPermission([`${player.id}_edit:player`, 'edit-any:player'])
    ) {
      logger.warn("User tried something it should't have done", {
        required: {
          anyClaim: [`${player.id}_edit:player`, 'edit-any:player']
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
      await Player.update(player, {
        where: { id: player.id },
        transaction
      });

      const dbPlayer = await Player.findByPk(player.id, { transaction });
      await transaction.commit();
      return dbPlayer;
    } catch (e) {
      logger.warn('rollback');
      await transaction.rollback();
      throw e;
    }
  }
};

export const updatePlayerRankingMutation = {
  type: PlayerType,
  args: {
    rankingPlace: {
      name: 'rankingPlace',
      type: RankingPlaceInputType
    }
  },
  resolve: async (findOptions, { rankingPlace }, context) => {
    if (context?.req?.user == null || !context.req.user.hasAnyPermission(['edit-any:player'])) {
      logger.warn("User tried something it should't have done", {
        required: {
          anyClaim: ['edit-any:player']
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
      await RankingPlace.update(
        {
          single: rankingPlace.single,
          double: rankingPlace.double,
          mix: rankingPlace.mix
        },
        {
          where: {
            id: rankingPlace.id
          },
          transaction
        }
      );

      await transaction.commit();
    } catch (e) {
      logger.warn('rollback');
      await transaction.rollback();
      throw e;
    }
  }
};
