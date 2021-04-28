import {
  AuthenticationSercice,
  Claim,
  DataBaseHandler,
  logger,
  Player,
  Role
} from '@badvlasim/shared';
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
    if (
      context?.req?.user == null ||
      !context.req.user.hasAnyPermission([
        clubId + '_add:role',
        clubId + '_edit:club',
        'edit-any:club'
      ])
    ) {
      logger.warn("User tried something it should't have done", {
        required: {
          anyClaim: [clubId + '_add:role', clubId + '_edit:club', 'edit-any:club']
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
      const roleDb = await new Role(role).save({ transaction });

      await roleDb.setClub(clubId, { transaction });
      await roleDb.setClaims(
        role?.claims?.map(c => c.id),
        { transaction }
      );

      await transaction.commit();
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
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbRole = await Role.findByPk(roleId);

      if (!dbRole) {
        throw new ApiError({
          code: 404,
          message: 'Role not found'
        });
      }

      if (
        context?.req?.user == null ||
        !context.req.user.hasAnyPermission([
          dbRole.clubId + '_edit:role',
          dbRole.clubId + '_edit:club',
          'edit-any:club'
        ])
      ) {
        logger.warn("User tried something it should't have done", {
          required: {
            anyClaim: [dbRole.clubId + '_edit:role', dbRole.clubId + '_edit:club', 'edit-any:club']
          },
          received: context?.req?.user?.permissions
        });
        throw new ApiError({
          code: 401,
          message: "You don't have permission to do this "
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

      AuthenticationSercice.permissinoCache.delete(dbPlayer.id);

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
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbRole = await Role.findByPk(roleId);

      if (!dbRole) {
        throw new ApiError({
          code: 404,
          message: 'Role not found'
        });
      }

      if (
        context?.req?.user == null ||
        !context.req.user.hasAnyPermission([
          dbRole.clubId + '_edit:role',
          dbRole.clubId + '_edit:club',
          'edit-any:club'
        ])
      ) {
        logger.warn("User tried something it should't have done", {
          required: {
            anyClaim: [dbRole.clubId + '_edit:role', dbRole.clubId + '_edit:club', 'edit-any:club']
          },
          received: context?.req?.user?.permissions
        });
        throw new ApiError({
          code: 401,
          message: "You don't have permission to do this "
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
      AuthenticationSercice.permissinoCache.delete(dbPlayer.id);

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
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbRole = await Role.findByPk(role.id);

      if (!dbRole) {
        throw new ApiError({
          code: 404,
          message: 'Role not found'
        });
      }

      if (
        context?.req?.user == null ||
        !context.req.user.hasAnyPermission([
          dbRole.clubId + '_edit:role',
          dbRole.clubId + '_edit:club',
          'edit-any:club'
        ])
      ) {
        logger.warn("User tried something it should't have done", {
          required: {
            anyClaim: [dbRole.clubId + '_edit:role', dbRole.clubId + '_edit:club', 'edit-any:club']
          },
          received: context?.req?.user?.permissions
        });
        throw new ApiError({
          code: 401,
          message: "You don't have permission to do this "
        });
      }

      await dbRole.update(role, { transaction });

      await dbRole.setClaims(
        role?.claims?.map(c => c.id),
        { transaction }
      );

      const players = await dbRole.getPlayers({ transaction, attributes: ['id'] });
      for (const player of players) {
        AuthenticationSercice.permissinoCache.delete(player.id);
      }

      await transaction.commit();
      return dbRole;
    } catch (e) {
      logger.warn('rollback');
      await transaction.rollback();
      throw e;
    }
  }
};

export const removeRoleMutation = {
  type: RoleType,
  args: {
    id: {
      name: 'id',
      type: GraphQLID
    }
  },
  resolve: async (findOptions, { id }, context) => {
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbRole = await Role.findByPk(id);

      if (!dbRole) {
        logger.debug('role', dbRole);
        throw new ApiError({
          code: 404,
          message: 'Role not found'
        });
      }

      if (
        context?.req?.user == null ||
        !context.req.user.hasAnyPermission([`${dbRole.clubId}_remove:role`, 'edit-any:club'])
      ) {
        logger.warn("User tried something it should't have done", {
          required: {
            anyClaim: [`${dbRole.clubId}_remove:role`, 'edit-any:club']
          },
          received: context?.req?.user?.permissions
        });
        throw new ApiError({
          code: 401,
          message: "You don't have permission to do this "
        });
      }


      const players = await dbRole.getPlayers({ transaction, attributes: ['id'] });
      for (const player of players) {
        AuthenticationSercice.permissinoCache.delete(player.id);
      }
      await dbRole.destroy({ transaction });

      await transaction.commit();
      return dbRole;
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};
