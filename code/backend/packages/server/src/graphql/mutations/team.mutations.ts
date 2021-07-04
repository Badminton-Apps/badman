import {
  Club,
  DataBaseHandler,
  EventCompetition,
  logger,
  Player,
  SubEventCompetition,
  Team,
  TeamPlayerMembership
} from '@badvlasim/shared';
import { GraphQLBoolean, GraphQLID, GraphQLNonNull } from 'graphql';
import { Op } from 'sequelize';
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
          type: team.type,
          teamNumber: team.teamNumber,
          clubId
        },
        defaults: team,
        transaction
      });

      if (created) {
        await teamDb.setClub(clubId, { transaction });
      } else {
        // Re-activate team
        teamDb.active = true;
        await teamDb.save({ transaction });
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
  resolve: async (findOptions, { team }: { team: Partial<Team> }, context) => {
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbTeam = await Team.findByPk(team.id, { transaction, include: [Club] });

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

      const changedTeams = [];

      if (team.teamNumber && team.teamNumber !== dbTeam.teamNumber) {
        team.name = `${dbTeam.club.name} ${team.teamNumber}${Team.getLetterForRegion(
          dbTeam.type,
          'vl'
        )}`;
        team.abbreviation = `${dbTeam.club.abbreviation} ${
          team.teamNumber
        }${Team.getLetterForRegion(dbTeam.type, 'vl')}`;

        if (team.teamNumber > dbTeam.teamNumber) {
          // Number was increased
          const dbLowerTeams = await Team.findAll({
            where: {
              clubId: dbTeam.clubId,
              teamNumber: {
                [Op.and]: [{ [Op.gt]: dbTeam.teamNumber }, { [Op.lte]: team.teamNumber }]
              },
              type: dbTeam.type
            },
            transaction
          });
          // unique contraints
          for (const dbLteam of dbLowerTeams) {
            dbLteam.teamNumber--;
            // set teams to temp name for unique constraint
            dbLteam.name = `${dbTeam.club.name} ${dbLteam.teamNumber}${Team.getLetterForRegion(
              dbLteam.type,
              'vl'
            )}_temp`;
            dbLteam.abbreviation = `${dbTeam.club.abbreviation} ${
              dbLteam.teamNumber
            }${Team.getLetterForRegion(dbLteam.type, 'vl')}`;
            await dbLteam.save({ transaction });
            changedTeams.push(dbLteam);
          }
        } else if (team.teamNumber < dbTeam.teamNumber) {
          // number was decreased
          const dbHigherTeams = await Team.findAll({
            where: {
              clubId: dbTeam.clubId,
              teamNumber: {
                [Op.and]: [{ [Op.lt]: dbTeam.teamNumber }, { [Op.gte]: team.teamNumber }]
              },
              type: dbTeam.type
            },
            transaction
          });
          for (const dbHteam of dbHigherTeams) {
            dbHteam.teamNumber++;
            // set teams to temp name for unique constraint
            dbHteam.name = `${dbTeam.club.name} ${dbHteam.teamNumber}${Team.getLetterForRegion(
              dbHteam.type,
              'vl'
            )}_temp`;
            dbHteam.abbreviation = `${dbTeam.club.abbreviation} ${
              dbHteam.teamNumber
            }${Team.getLetterForRegion(dbHteam.type, 'vl')}`;
            await dbHteam.save({ transaction });
            changedTeams.push(dbHteam);
          }
        }
      }

      await dbTeam.update(team, { transaction });
      // set impacted teams to final name
      for (const dbCteam of changedTeams) {
        dbCteam.name = `${dbTeam.club.name} ${dbCteam.teamNumber}${Team.getLetterForRegion(
          dbCteam.type,
          'vl'
        )}`;
        await dbCteam.save({ transaction });
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
      const subEvents = (
        await EventCompetition.findAll({
          where: { startYear: dbNewSubEvent.event.startYear },
          attributes: [],
          include: [{ model: SubEventCompetition, attributes: ['id'] }],
          transaction
        })
      )
        .map(e => e.subEvents?.map(s => s?.id))
        .flat();

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

      if (subEvents !== null && subEvents.length > 0) {
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
