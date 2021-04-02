import { Claim, DataBaseHandler, logger, Player, Role } from '@badvlasim/shared';
import { GraphQLBoolean, GraphQLID, GraphQLInt } from 'graphql';
import { ApiError } from '../../models/api.error';
import { ClaimType, RoleInputType, RoleType } from '../types';

export const addRoleMutation = {
  type: RoleType,
  args: {
    role: {
      name: 'Role',
      type: RoleInputType
    },
    clubId: {
      name: 'clubId',
      type: GraphQLInt
    }
  },
  resolve: async (findOptions, { role, clubId }, context) => {
    if (context?.req?.user == null || !context.req.user.hasAnyPermission(['add:role'])) {
      throw new ApiError({
        code: 401,
        message: "You don't have permission to do this "
      });
    }
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const roleDb = await new Role(role).save({ transaction });

      await roleDb.setClub(clubId, {transaction});
      await roleDb.setClaims(
        role?.claims?.map(c => c.id),
        { transaction }
      );

      await  transaction.commit();
      return roleDb;
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};

export const addPlayerToRoleMutation = {
  type: RoleType,
  args: {
    roleId: {
      name: 'roleId',
      type: GraphQLID
    },
    playerId: {
      name: 'playerId',
      type: GraphQLID
    }
  },
  resolve: async (findOptions, { roleId, playerId }, context) => {
    if (context?.req?.user == null || !context.req.user.hasAnyPermission(['edit:role'])) {
      throw new ApiError({
        code: 401,
        message: "You don't have permission to do this "
      });
    }
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbRole = await Role.findByPk(roleId, {
        transaction
      });

      if (!dbRole) {
        throw new ApiError({
          code: 404,
          message: 'Role not found'
        });
      }

      const dbPlayer = await Player.findByPk(playerId, {
        transaction
      });

      if (!dbPlayer) {
        throw new ApiError({
          code: 404,
          message: 'Player not found'
        });
      }

      await dbRole.addPlayer(dbPlayer, {
        transaction
      });

      await transaction.commit();
      return dbRole;
    } catch (e) {
      logger.warn('rollback');
      await transaction.rollback();
      throw e;
    }
  }
};

export const removePlayerFromRoleMutation = {
  type: RoleType,
  args: {
    roleId: {
      name: 'roleId',
      type: GraphQLID
    },
    playerId: {
      name: 'playerId',
      type: GraphQLID
    }
  },
  resolve: async (findOptions, { roleId, playerId }, context) => {
    if (context?.req?.user == null || !context.req.user.hasAnyPermission(['edit:role'])) {
      throw new ApiError({
        code: 401,
        message: "You don't have permission to do this "
      });
    }
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbRole = await Role.findByPk(roleId, {
        transaction
      });

      if (!dbRole) {
        throw new ApiError({
          code: 404,
          message: 'Role not found'
        });
      }

      const dbPlayer = await Player.findByPk(playerId, {
        transaction
      });

      if (!dbPlayer) {
        throw new ApiError({
          code: 404,
          message: 'Player not found'
        });
      }

      await dbRole.removePlayer(dbPlayer, {
        transaction
      });

      await transaction.commit();
      return dbRole;
    } catch (e) {
      logger.warn('rollback');
      await transaction.rollback();
      throw e;
    }
  }
};

export const updateRoleMutation = {
  type: RoleType,
  args: {
    role: {
      name: 'Role',
      type: RoleInputType
    }
  },
  resolve: async (findOptions, { role }, context) => {
    if (context?.req?.user == null || !context.req.user.hasAnyPermission(['edit:role'])) {
      throw new ApiError({
        code: 401,
        message: "You don't have permission to do this "
      });
    }
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbRole = await Role.findByPk(role.id, {
        transaction
      });

      if (!dbRole) {
        throw new ApiError({
          code: 404,
          message: 'Role not found'
        });
      }

      await dbRole.update(role, { transaction });

      await dbRole.setClaims(
        role?.claims?.map(c => c.id),
        { transaction }
      );

      await transaction.commit();
      return dbRole;
    } catch (e) {
      logger.warn('rollback');
      await transaction.rollback();
      throw e;
    }
  }
};
