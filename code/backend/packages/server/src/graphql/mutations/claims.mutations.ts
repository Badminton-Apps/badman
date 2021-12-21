import {
  ApiError,
  AuthenticatedRequest,
  AuthenticationSercice,
  canExecute,
  DataBaseHandler,
  logger,
  Player
} from '@badvlasim/shared';
import { GraphQLBoolean, GraphQLID } from 'graphql';
import { RoleType } from '../types';

export const updateGlobalClaimUserMutation = {
  type: RoleType,
  args: {
    playerId: {
      name: 'playerId',
      type: GraphQLID
    },
    claimId: {
      name: 'ClaimId',
      type: GraphQLID
    },
    active: {
      name: 'Active',
      type: GraphQLBoolean
    }
  },
  resolve: async (
    findOptions: { [key: string]: object },
    { playerId, claimId, active },
    context: { req: AuthenticatedRequest }
  ) => {
    canExecute(context?.req?.user, { anyPermissions: [`edit:claims`] });

    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbPlayer = await Player.findByPk(playerId, {
        transaction
      });

      if (!dbPlayer) {
        throw new ApiError({
          code: 404,
          message: 'Role not found'
        });
      }

      if (active) {
        await dbPlayer.addClaim(claimId, { transaction });
      } else {
        await dbPlayer.removeClaim(claimId, { transaction });
      }

      AuthenticationSercice.permissionCache.delete(dbPlayer.id);

      await transaction.commit();
      return dbPlayer;
    } catch (e) {
      logger.error('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};
