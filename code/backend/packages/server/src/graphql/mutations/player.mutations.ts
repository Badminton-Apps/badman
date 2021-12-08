import {
  AuthenticatedRequest,
  canExecute,
  ClubMembership,
  DataBaseHandler,
  LastRankingPlace,
  logger,
  Player,
  RankingPlace,
  RankingSystem
} from '@badvlasim/shared';
import { GraphQLNonNull, GraphQLString } from 'graphql';
import { ApiError } from '@badvlasim/shared/utils/api.error';
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
    canExecute(context?.req?.user, { anyPermissions: ['add:player'] });

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
    const dbPlayer = await Player.findByPk(player.id, {
      include: [{ model: ClubMembership, where: { end: null }, required: false }]
    });

    if (!dbPlayer) {
      throw new ApiError({
        code: 404,
        message: 'Player not found'
      });
    }

    const permissions = [`${player.id}_edit:player`, 'edit-any:player'];
    if (dbPlayer.clubs.length > 0) {
      permissions.push(`${dbPlayer.clubs[0].id}_edit:player`);
    }

    canExecute(context?.req?.user, {
      anyPermissions: permissions
    });

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
              phone: player.phone,
              memberId: player.memberId,
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
    canExecute(context?.req?.user, { anyPermissions: ['edit:ranking'] });
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
        const system = await RankingSystem.findOne({ where: { primary: true } });
        await new LastRankingPlace({
          playerId,
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
