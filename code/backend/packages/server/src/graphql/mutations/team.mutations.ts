import {
  Club,
  DataBaseHandler,
  EventCompetition,
  logger,
  Player,
  SubEventCompetition,
  Team,
  TeamLocationCompetition,
  TeamPlayerMembership
} from '@badvlasim/shared';
import { GraphQLBoolean, GraphQLID, GraphQLInt, GraphQLNonNull } from 'graphql';
import { ApiError } from '../../models/api.error';
import { TeamInputType, TeamType } from '../types';

export const addTeamMutation = {
  type: TeamType,
  args: {
    team: {
      name: 'Team',
      type: new GraphQLNonNull(TeamInputType)
    },
    clubId: {
      name: 'clubId',
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  resolve: async (findOptions, { team, clubId }, context) => {
    if (
      context?.req?.user == null ||
      !context.req.user.hasAnyPermission([`${clubId}_add:team`, 'add-any:club'])
    ) {
      logger.warn("User tried something it should't have done", {
        required: {
          anyClaim: [`${clubId}_add:team`, 'add-any:club']
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
      const [teamDb, created] = await Team.findOrCreate({
        where: {
          name: team.name,
          clubId
        },
        defaults: team,
        transaction
      });

      if (created) {
        teamDb.setClub(clubId, { transaction });
      } else {
        // Re-activate team
        teamDb.active = true;
        teamDb.save({ transaction });
      }

      await transaction.commit();
      return teamDb;
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};

export const removeTeamMutation = {
  type: TeamType,
  args: {
    teamId: {
      name: 'teamId',
      type: GraphQLID
    }
  },
  resolve: async (findOptions, { teamId, playerId }, context) => {
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbTeam = await Team.findByPk(teamId, { transaction });

      if (!dbTeam) {
        logger.debug('team', dbTeam);
        throw new ApiError({
          code: 404,
          message: 'Team not found'
        });
      }

      if (
        context?.req?.user == null ||
        !context.req.user.hasAnyPermission([`${dbTeam.clubId}_edit:team`, 'edit-any:club'])
      ) {
        logger.warn("User tried something it should't have done", {
          required: {
            anyClaim: [`${dbTeam.clubId}_edit:team`, 'edit-any:club']
          },
          received: context?.req?.user?.permissions
        });
        throw new ApiError({
          code: 401,
          message: "You don't have permission to do this "
        });
      }

      await dbTeam.destroy({ transaction });

      await transaction.commit();
      return dbTeam;
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};

export const updateTeamMutation = {
  type: TeamType,
  args: {
    team: {
      name: 'Team',
      type: TeamInputType
    }
  },
  resolve: async (findOptions, { team }, context) => {
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbTeam = await Team.findByPk(team.id, { transaction });

      if (!dbTeam) {
        logger.debug('team', dbTeam);
        throw new ApiError({
          code: 404,
          message: 'Team not found'
        });
      }

      if (
        context?.req?.user == null ||
        !context.req.user.hasAnyPermission([`${dbTeam.clubId}_edit:team`, 'edit-any:club'])
      ) {
        logger.warn("User tried something it should't have done", {
          required: {
            anyClaim: [`${dbTeam.clubId}_edit:team`, 'edit-any:club']
          },
          received: context?.req?.user?.permissions
        });
        throw new ApiError({
          code: 401,
          message: "You don't have permission to do this "
        });
      }

      await dbTeam.update(team, { transaction });
      await transaction.commit();
      return dbTeam;
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
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
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbTeam = await Team.findByPk(teamId, { transaction });

      if (!dbTeam) {
        logger.debug('team', dbTeam);
        throw new ApiError({
          code: 404,
          message: 'Team not found'
        });
      }

      if (
        context?.req?.user == null ||
        !context.req.user.hasAnyPermission([`${dbTeam.clubId}_edit:team`, 'edit-any:club'])
      ) {
        logger.warn("User tried something it should't have done", {
          required: {
            anyClaim: [`${dbTeam.clubId}_edit:team`, 'edit-any:club']
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

      await dbTeam.addPlayer(dbPlayer, {
        transaction,
        through: {
          start: new Date()
        }
      });

      await transaction.commit();
      return dbTeam;
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};

export const removePlayerFromTeamMutation = {
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
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbTeam = await Team.findByPk(teamId, { transaction });

      if (!dbTeam) {
        logger.debug('team', dbTeam);
        throw new ApiError({
          code: 404,
          message: 'Team not found'
        });
      }

      if (
        context?.req?.user == null ||
        !context.req.user.hasAnyPermission([`${dbTeam.clubId}_edit:team`, 'edit-any:club'])
      ) {
        logger.warn("User tried something it should't have done", {
          required: {
            anyClaim: [`${dbTeam.clubId}_edit:team`, 'edit-any:club']
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

      await dbTeam.removePlayer(dbPlayer, {
        transaction
      });

      await transaction.commit();
      return dbTeam;
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};

export const updateSubEventTeamMutation = {
  type: TeamType,
  args: {
    teamId: {
      name: 'teamId',
      type: GraphQLID
    },
    subEventId: {
      name: 'subEventId',
      type: GraphQLID
    }
  },
  resolve: async (findOptions, { teamId, subEventId }, context) => {
    const dbTeam = await Team.findByPk(teamId);
  
    if (
      context?.req?.user == null ||
      !context.req.user.hasAnyPermission([`${dbTeam.clubId}_enlist:team`, 'edit-any:club'])
    ) {
      logger.warn("User tried something it should't have done", {
        required: {
          anyClaim: [`${dbTeam.clubId}_enlist:team`, 'add-any:club']
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
      
      // Find new subevent
      const dbNewSubEvent = await SubEventCompetition.findByPk(subEventId, {
        transaction,
        attributes: ['id'],
        include: [
          {
            model: EventCompetition,
            attributes: ['startYear']
          }
        ]
      });

      // Find all subEvents from same year
      const subEvents = (await EventCompetition.findAll({
        where: { startYear: dbNewSubEvent.event.startYear },
        attributes: [],
        include: [{ model: SubEventCompetition, attributes: ['id'] }],
        transaction
      })).map(r => r.subEvents?.map(r => r?.id)).flat();

      if (!dbTeam) {
        logger.debug('team', dbTeam);
        throw new ApiError({
          code: 404,
          message: 'Team not found'
        });
      }

      if (
        context?.req?.user == null ||
        !context.req.user.hasAnyPermission([`${dbTeam.clubId}_edit:team`, 'edit-any:club'])
      ) {
        logger.warn("User tried something it should't have done", {
          required: {
            anyClaim: [`${dbTeam.clubId}_edit:team`, 'edit-any:club']
          },
          received: context?.req?.user?.permissions
        });
        throw new ApiError({
          code: 401,
          message: "You don't have permission to do this "
        });
      }

      if (subEvents != null && subEvents.length> 0) {
        await dbTeam.removeSubEvents(subEvents, { transaction });
      }
      await dbTeam.addSubEvent(dbNewSubEvent.id, { transaction });

      await transaction.commit();
      return dbTeam;
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
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
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbTeam = await Team.findByPk(teamId, { transaction });

      if (!dbTeam) {
        logger.debug('team', dbTeam);
        throw new ApiError({
          code: 404,
          message: 'Team not found'
        });
      }

      if (
        context?.req?.user == null ||
        !context.req.user.hasAnyPermission([`${dbTeam.clubId}_edit:team`, 'edit-any:club'])
      ) {
        logger.warn("User tried something it should't have done", {
          required: {
            anyClaim: [`${dbTeam.clubId}_edit:team`, 'edit-any:club']
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

      await TeamPlayerMembership.update(
        {
          teamId: dbTeam.id,
          playerId: dbPlayer.id,
          base
        },
        { where: { teamId: dbTeam.id, playerId: dbPlayer.id }, transaction }
      );

      await transaction.commit();
      return dbTeam;
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};

export const updateTeamLocationMutation = {
  type: TeamType,
  args: {
    locationId: {
      name: 'locationId',
      type: GraphQLID
    },
    teamId: {
      name: 'teamId',
      type: GraphQLID
    },
    use: {
      name: 'use',
      type: GraphQLBoolean
    }
  },
  resolve: async (findOptions, { locationId, teamId, use }, context) => {
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbTeam = await Team.findByPk(teamId, { transaction });

      if (!dbTeam) {
        logger.debug('location', dbTeam);
        throw new ApiError({
          code: 404,
          message: 'location not found'
        });
      }

      if (use) {
        await dbTeam.addLocation(locationId, { transaction });
      } else {
        await dbTeam.removeLocation(locationId, { transaction });
      }

      await transaction.commit();
      return dbTeam;
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};
