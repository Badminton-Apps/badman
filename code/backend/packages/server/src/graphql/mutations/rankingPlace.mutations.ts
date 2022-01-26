import {
  ApiError,
  AuthenticatedRequest,
  canExecute,
  DataBaseHandler,
  logger,
  RankingPlace
} from '@badvlasim/shared';
import { GraphQLNonNull } from 'graphql';
import { RankingPlaceType, RankingPlaceInputType } from '../types';

export const addRankingPlaceMutation = {
  type: RankingPlaceType,
  args: {
    rankingPlace: {
      name: 'RankingPlace',
      type: new GraphQLNonNull(RankingPlaceInputType)
    }
  },
  resolve: async (
    _findOptions: { [key: string]: object },
    { rankingPlace }: { rankingPlace: Partial<RankingPlace> },
    context: { req: AuthenticatedRequest }
  ) => {
    canExecute(context?.req?.user, { anyPermissions: [`edit:ranking`] });

    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const [rankingPlaceDb] = await RankingPlace.findOrCreate({
        where: {
          playerId: rankingPlace.playerId,
          rankingDate: rankingPlace.rankingDate,
          SystemId: rankingPlace.SystemId
        },
        defaults: rankingPlace,
        transaction
      });

      await transaction.commit();
      return rankingPlaceDb;
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};

export const removeRankingPlaceMutation = {
  type: RankingPlaceType,
  args: {
    rankingPlace: {
      name: 'RankingPlace',
      type: new GraphQLNonNull(RankingPlaceInputType)
    }
  },
  resolve: async (
    _findOptions: { [key: string]: object },
    { rankingPlace },
    context: { req: AuthenticatedRequest }
  ) => {
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const rankingPlaceDb = await RankingPlace.findByPk(rankingPlace.id, { transaction });

      if (!rankingPlaceDb) {
        logger.debug('rankingPlace', { data: rankingPlace });
        throw new ApiError({
          code: 404,
          message: 'RankingPlace not found'
        });
      }

      canExecute(context?.req?.user, { anyPermissions: [`edit:ranking`] });

      await rankingPlaceDb.destroy({ transaction });

      await transaction.commit();
      return rankingPlaceDb;
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};

export const updateRankingPlaceMutation = {
  type: RankingPlaceType,
  args: {
    rankingPlace: {
      name: 'RankingPlace',
      type: new GraphQLNonNull(RankingPlaceInputType)
    }
  },
  resolve: async (
    _findOptions: { [key: string]: object },
    { rankingPlace }: { rankingPlace: Partial<RankingPlace> },
    context: { req: AuthenticatedRequest }
  ) => {
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const rankingPlaceDb = await RankingPlace.findByPk(rankingPlace.id, { transaction });

      if (!rankingPlaceDb) {
        logger.debug('rankingPlace', { data: rankingPlaceDb });
        throw new ApiError({
          code: 404,
          message: 'RankingPlace not found'
        });
      }
      canExecute(context?.req?.user, { anyPermissions: [`edit:ranking`] });

      await rankingPlaceDb.update(rankingPlace, { transaction });
      await transaction.commit();
      return rankingPlaceDb;
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};
