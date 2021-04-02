import { Claim, DataBaseHandler, logger, Player, Role } from '@badvlasim/shared';
import { GraphQLBoolean, GraphQLID, GraphQLInt } from 'graphql';
import { ApiError } from '../../models/api.error';
import { ClaimType, RoleInputType, RoleType } from '../types';


export const updateGlobalClaimUserMutation = {
  type: RoleType,
  args: {
    playerId: {
      name: 'PlayerId',
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
  resolve: async (findOptions, { playerId, claimId, active }, context) => {
    if (context?.req?.user == null || !context.req.user.hasAnyPermission(['edit:role'])) {
      throw new ApiError({
        code: 401,
        message: "You don't have permission to do this "
      });
    }
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

      if (active){
        await dbPlayer.addClaim(claimId, {transaction});
      } else{
        await dbPlayer.removeClaim(claimId, {transaction});
      }
      
      await transaction.commit();
      return dbPlayer;
    } catch (e) {
      logger.warn('rollback');
      await transaction.rollback();
      throw e;
    }
  }
};
