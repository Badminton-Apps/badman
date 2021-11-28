import {
  AuthenticatedRequest,
  DataBaseHandler,
  LastRankingPlace,
  logger,
  Player,
  RankingPlace,
  RankingSystem
} from '@badvlasim/shared';
import { GraphQLNonNull, GraphQLString } from 'graphql';
import { ApiError } from '../../models/api.error';
import { PlayerInputType, PlayerType, RankingPlaceInputType } from '../types';

export const addPlayerMutation = {
  type: PlayerType,
  args: {
    player: {
      name: 'Player',
      type: PlayerInputType
    }
  },
  resolve: async (
    findOptions: { [key: string]: object },
    { player },
    context: { req: AuthenticatedRequest }
  ) => {
    // || !context.req.user.hasAnyPermission(['add:player'])
    if (context?.req?.user === null) {
      // logger.warn("User tried something it should't have done", {
      //   required: {
      //     anyClaim: ['add:player']
      //   },
      //   received: context?.req?.user?.permissions
      // });
      throw new ApiError({
        code: 401,
        message: 'You need to be logged in '
      });
    }

    if (player.memberId === null || player.firstName === null || player.lastName === null) {
      throw new ApiError({
        code: 500,
        message: 'Memberid, firstname and lastname are required'
      });
    }
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const playerDb = await Player.create(player, { transaction });

      await transaction.commit();
      return playerDb;
    } catch (e) {
      logger.error('rollback', e);
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
  resolve: async (
    findOptions: { [key: string]: object },
    { player },
    context: { req: AuthenticatedRequest }
  ) => {
    // TODO: check if the player is in the club and thbe user is allowed to change values

    if (
      context?.req?.user === null ||
      !context.req.user.hasAnyPermission([`${player.id}_edit:player`, 'edit-any:player'])
    ) {
      throw new ApiError({
        code: 401,
        message: 'No permissions'
      });
    }

    let canEditAllFields = false;
    if (context.req.user.hasAnyPermission(['edit-any:player'])) {
      canEditAllFields = true;
    }

    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      await Player.update(
        canEditAllFields
          ? player
          : {
              email: player.email,
              phone: player.phone
            },
        {
          where: { id: player.id },
          transaction
        }
      );

      const dbPlayer = await Player.findByPk(player.id, { transaction });
      await transaction.commit();
      return dbPlayer;
    } catch (e) {
      logger.error('rollback', e);
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
      type: new GraphQLNonNull(RankingPlaceInputType)
    },
    playerId: {
      name: 'playerId',
      type: new GraphQLNonNull(GraphQLString)
    }
  },
  resolve: async (
    findOptions: { [key: string]: object },
    { rankingPlace, playerId },
    context: { req: AuthenticatedRequest }
  ) => {
    if (
      context?.req?.user === null ||
      !context.req.user.hasAnyPermission(['edit:player-ranking'])
    ) {
      logger.warn("User tried something it should't have done", {
        required: {
          anyClaim: ['edit:player-ranking']
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
      const dbLastRanking = await LastRankingPlace.findByPk(rankingPlace.id, { transaction });
      if (dbLastRanking !== null) {
        if (dbLastRanking.playerId !== playerId) {
          throw new ApiError({
            code: 500,
            message: 'This ranking place is from another player'
          });
        }

        dbLastRanking.single = rankingPlace.single ?? dbLastRanking.single;
        dbLastRanking.double = rankingPlace.double ?? dbLastRanking.double;
        dbLastRanking.mix = rankingPlace.mix ?? dbLastRanking.mix;
        await dbLastRanking.save({ transaction });

        const dbRankingPlaces = await RankingPlace.findAll({
          where: {
            playerId: dbLastRanking.playerId,
            SystemId: dbLastRanking.systemId
          },
          transaction
        });

        dbRankingPlaces.sort((a, b) => {
          return b.rankingDate.getTime() - a.rankingDate.getTime();
        });

        for (const dbRankingPlace of dbRankingPlaces) {
          dbRankingPlace.single = rankingPlace.single ?? dbRankingPlace.single;
          dbRankingPlace.double = rankingPlace.double ?? dbRankingPlace.double;
          dbRankingPlace.mix = rankingPlace.mix ?? dbRankingPlace.mix;
          await dbRankingPlace.save({ transaction });

          // Go back untill update was possible
          if (dbRankingPlace.updatePossible == true) {
            break;
          }
        }
      } else {
        const system = await RankingSystem.findOne({where: {primary: true}});
        await new LastRankingPlace({
          playerId ,
          systemId: system.id,
          single: rankingPlace.single,
          double: rankingPlace.double,
          mix: rankingPlace.mix
        }).save({ transaction });
      }

      await transaction.commit();

      return await Player.findByPk(playerId);
    } catch (e) {
      logger.error('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};
