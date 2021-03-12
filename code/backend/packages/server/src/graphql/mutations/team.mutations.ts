import { DataBaseHandler, logger, Player, Team, TeamPlayerMembership } from '@badvlasim/shared';
import { GraphQLBoolean, GraphQLID, GraphQLInt } from 'graphql';
import { ApiError } from '../../models/api.error';
import { TeamInputType, TeamType } from '../types';

export const addTeamMutation = {
  type: TeamType,
  args: {
    team: {
      name: 'Team',
      type: TeamInputType
    },
    clubId: {
      name: 'clubId',
      type: GraphQLInt
    }
  },
  resolve: async (findOptions, { team, clubId }, context) => {
    if (!context.req.user.hasAnyPermission(['add:team'])) {
      throw new ApiError({
        code: 401,
        message: "You don't have permission to do this "
      });
    }
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const teamDb = await Team.create(
        {
          ...team,
          clubId
        },
        { transaction }
      );

      transaction.commit();
      return teamDb;
    } catch (e) {
      logger.warn('rollback');
      transaction.rollback();
      throw e;
    }
  }
};

export const addPlayerToTeamMutation = {
  type: TeamType,
  args: {
    teamId: {
      name: 'teamId',
      type: GraphQLID
    },
    playerId: {
      name: 'playerId',
      type: GraphQLID
    }
  },
  resolve: async (findOptions, { teamId, playerId }, context) => {
    if (!context.req.user.hasAnyPermission(['edit:team'])) {
      throw new ApiError({
        code: 401,
        message: "You don't have permission to do this "
      });
    }
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbTeam = await Team.findByPk(teamId, {
        transaction
      });

      if (!dbTeam) {
        throw new ApiError({
          code: 404,
          message: 'Team not found'
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

      const result = await dbTeam.addPlayer(dbPlayer, {
        transaction,
        through: {
          start: new Date()
        }
      });

      transaction.commit();
      return dbTeam;
    } catch (e) {
      logger.warn('rollback');
      transaction.rollback();
      throw e;
    }
  }
};

export const removePlayerToTeamMutation = {
  type: TeamType,
  args: {
    teamId: {
      name: 'teamId',
      type: GraphQLID
    },
    playerId: {
      name: 'playerId',
      type: GraphQLID
    }
  },
  resolve: async (findOptions, { teamId, playerId }, context) => {
    if (!context.req.user.hasAnyPermission(['edit:team'])) {
      throw new ApiError({
        code: 401,
        message: "You don't have permission to do this "
      });
    }
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbTeam = await Team.findByPk(teamId, {
        transaction
      });

      if (!dbTeam) {
        logger.debug('team', dbTeam);
        throw new ApiError({
          code: 404,
          message: 'Team not found'
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

      const result = await dbTeam.removePlayer(dbPlayer, {
        transaction
      });

      transaction.commit();
      return dbTeam;
    } catch (e) {
      logger.warn('rollback');
      transaction.rollback();
      throw e;
    }
  }
};

export const updatePlayerTeamMutation = {
  type: TeamType,
  args: {
    teamId: {
      name: 'teamId',
      type: GraphQLID
    },
    playerId: {
      name: 'playerId',
      type: GraphQLID
    },
    base: {
      name: 'base',
      type: GraphQLBoolean
    }
  },
  resolve: async (findOptions, { teamId, playerId, base }, context) => {
    if (!context.req.user.hasAnyPermission(['edit:team'])) {
      throw new ApiError({
        code: 401,
        message: "You don't have permission to do this "
      });
    }
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbTeam = await Team.findByPk(teamId, {
        transaction
      });

      if (!dbTeam) {
        logger.debug('team', dbTeam);
        throw new ApiError({
          code: 404,
          message: 'Team not found'
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

      await TeamPlayerMembership.update(
        {
          teamId: dbTeam.id,
          playerId: dbPlayer.id,
          base
        },
        { where: { teamId: dbTeam.id, playerId: dbPlayer.id }, transaction }
      );

      transaction.commit();
      return dbTeam;
    } catch (e) {
      logger.warn('rollback');
      transaction.rollback();
      throw e;
    }
  }
};

export const updateTeamMutation = {
  type: TeamType,
  args: {
    id: {
      name: 'Id',
      type: GraphQLInt
    },
    team: {
      name: 'Team',
      type: TeamInputType
    }
  },
  resolve: async (findOptions, { id, team }, context) => {
    if (!context.req.user.hasAnyPermission(['edit:team'])) {
      throw new ApiError({
        code: 401,
        message: "You don't have permission to do this "
      });
    }
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      await Team.update(team, {
        where: { id: team.id },
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

