import {
  ApiError,
  AuthenticatedRequest,
  canExecute,
  Club,
  DataBaseHandler,
  EventCompetition,
  EventEntry,
  logger,
  Player,
  RankingPlace,
  RankingSystem,
  SubEventCompetition,
  SubEventType,
  Team,
  TeamPlayerMembership
} from '@badvlasim/shared';
import { GraphQLBoolean, GraphQLID, GraphQLNonNull } from 'graphql';
import moment from 'moment';
import { Op } from 'sequelize';
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
  resolve: async (
    findOptions: { [key: string]: object },
    { team, clubId },
    context: { req: AuthenticatedRequest }
  ) => {
    canExecute(context?.req?.user, {
      anyPermissions: [`${clubId}_add:team`, 'add-any:club']
    });

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
  resolve: async (
    findOptions: { [key: string]: object },
    { teamId },
    context: { req: AuthenticatedRequest }
  ) => {
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbTeam = await Team.findByPk(teamId, { transaction });

      if (!dbTeam) {
        logger.debug('team', { data: dbTeam });
        throw new ApiError({
          code: 404,
          message: 'Team not found'
        });
      }
      canExecute(context?.req?.user, {
        anyPermissions: [`${dbTeam.clubId}_edit:team`, 'edit-any:club']
      });

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
  resolve: async (
    findOptions: { [key: string]: object },
    { team }: { team: Partial<Team> },
    context: { req: AuthenticatedRequest }
  ) => {
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbTeam = await Team.findByPk(team.id, {
        transaction,
        include: [{ model: Club }, { model: Player, as: 'captain' }]
      });

      if (!dbTeam) {
        throw new ApiError({
          code: 404,
          message: 'Team not found'
        });
      }

      canExecute(context?.req?.user, {
        anyPermissions: [`${dbTeam.clubId}_edit:team`, 'edit-any:club']
      });

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
  resolve: async (
    findOptions: { [key: string]: object },
    { teamId, playerId },
    context: { req: AuthenticatedRequest }
  ) => {
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbTeam = await Team.findByPk(teamId, { transaction });

      if (!dbTeam) {
        logger.debug('team', { data: dbTeam });
        throw new ApiError({
          code: 404,
          message: 'Team not found'
        });
      }

      canExecute(context?.req?.user, {
        anyPermissions: [`${dbTeam.clubId}_edit:team`, 'edit-any:club']
      });

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
  resolve: async (
    findOptions: { [key: string]: object },
    { teamId, playerId },
    context: { req: AuthenticatedRequest }
  ) => {
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbTeam = await Team.findByPk(teamId, { transaction });

      if (!dbTeam) {
        logger.debug('team', { data: dbTeam });
        throw new ApiError({
          code: 404,
          message: 'Team not found'
        });
      }

      canExecute(context?.req?.user, {
        anyPermissions: [`${dbTeam.clubId}_edit:team`, 'edit-any:club']
      });

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
  resolve: async (
    findOptions: { [key: string]: object },
    { teamId, subEventId },
    context: { req: AuthenticatedRequest }
  ) => {
    const dbTeam = await Team.findByPk(teamId);

    if (!dbTeam) {
      throw new ApiError({
        code: 404,
        message: 'Team not found'
      });
    }
    canExecute(context?.req?.user, {
      anyPermissions: [`${dbTeam.clubId}_enlist:team`, 'edit-any:club']
    });

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

      const currentEntries = await dbTeam.getEntries({
        include: [
          {
            model: SubEventCompetition,
            attributes: ['id'],
            required: true,
            include: [
              {
                model: EventCompetition,
                attributes: ['id'],
                required: true,
                where: {
                  startYear: dbNewSubEvent.event.startYear
                }
              }
            ]
          }
        ],
        transaction
      });

      for (const entry of currentEntries) {
        await entry.destroy({ transaction });
      }

      const newEntry = new EventEntry({
        teamId: dbTeam.id,
        subEventId: dbNewSubEvent.id,
        entryType: 'competition'
      });
      await newEntry.save({ transaction });

      await transaction.commit();
      return dbTeam;
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};

export const updateSubEventTeamMutationOld = {
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
  resolve: async (
    findOptions: { [key: string]: object },
    { teamId, subEventId },
    context: { req: AuthenticatedRequest }
  ) => {
    const dbTeam = await Team.findByPk(teamId);

    if (!dbTeam) {
      throw new ApiError({
        code: 404,
        message: 'Team not found'
      });
    }
    canExecute(context?.req?.user, {
      anyPermissions: [`${dbTeam.clubId}_enlist:team`, 'edit-any:club']
    });

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
        .map((e) => e.subEvents?.map((s) => s?.id))
        .flat();

      if (!dbTeam) {
        logger.debug('team', { data: dbTeam });
        throw new ApiError({
          code: 404,
          message: 'Team not found'
        });
      }

      if (
        context?.req?.user === null ||
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

      // if (subEvents !== null && subEvents.length > 0) {
      //   await dbTeam.removeSubEvents(subEvents, { transaction });
      // }
      // await dbTeam.addSubEvent(dbNewSubEvent.id, { transaction });

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
  resolve: async (
    findOptions: { [key: string]: object },
    { teamId, playerId, base },
    context: { req: AuthenticatedRequest }
  ) => {
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbTeam = await Team.findByPk(teamId, { transaction });

      if (!dbTeam) {
        logger.debug('team', { data: dbTeam });
        throw new ApiError({
          code: 404,
          message: 'Team not found'
        });
      }
      canExecute(context?.req?.user, {
        anyPermissions: [`${dbTeam.clubId}_edit:team`, 'edit-any:club']
      });

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
  resolve: async (
    findOptions: { [key: string]: object },
    { locationId, teamId, use },
    context: { req: AuthenticatedRequest }
  ) => {
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbTeam = await Team.findByPk(teamId, { transaction });

      if (!dbTeam) {
        throw new ApiError({
          code: 404,
          message: 'location not found'
        });
      }

      canExecute(context?.req?.user, {
        anyPermissions: [`${dbTeam.clubId}_edit:team`, 'edit-any:club']
      });

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

export const addPlayerBaseSubEventMutation = {
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
    subEventId: {
      name: 'subEventId',
      type: GraphQLID
    }
  },
  resolve: async (
    findOptions: { [key: string]: object },
    { teamId, playerId, subEventId },
    context: { req: AuthenticatedRequest }
  ) => {
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbTeam = await Team.findByPk(teamId, { transaction });

      if (!dbTeam) {
        throw new ApiError({
          code: 404,
          message: 'Team not found'
        });
      }

      canExecute(context?.req?.user, {
        anyPermissions: [`change-base:team`]
      });

      const dbMembership = await EventEntry.findOne({
        where: {
          teamId: dbTeam.id,
          subEventId
        },
        transaction
      });
      if (!dbMembership) {
        throw new ApiError({
          code: 404,
          message: 'SubEvent not found'
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

      const dbSubEvent = await SubEventCompetition.findByPk(subEventId, {
        attributes: [],
        include: [{ model: EventCompetition, attributes: ['startYear'] }]
      });

      const dbSystem = await RankingSystem.findOne({
        where: {
          primary: true
        },
        transaction
      });

      if (!dbSystem) {
        throw new ApiError({
          code: 404,
          message: 'System not found'
        });
      }

      const startDate = moment([dbSubEvent.event.startYear, 4, 14]).toDate();
      const endDate = moment([dbSubEvent.event.startYear, 4, 16]).toDate();
      const dbRanking = await RankingPlace.findOne({
        where: {
          playerId: dbPlayer.id,
          SystemId: dbSystem.id,
          rankingDate: { [Op.between]: [startDate, endDate] }
        },
        transaction
      });

      const meta = dbMembership.meta;
      meta?.competition.players.push({
        id: dbPlayer.id,
        single: dbRanking?.single ?? 12,
        double: dbRanking?.double ?? 12,
        mix: dbRanking?.mix ?? 12,
        gender: dbPlayer.gender
      });

      let bestPlayers = meta?.competition.players;
      if (meta?.competition.players.length > 4) {
        if (dbTeam.type === SubEventType.MX) {
          bestPlayers = [
            ...meta?.competition.players
              .filter((p) => p.gender === 'M')
              .sort(
                (b, a) =>
                  (b?.single ?? 12) +
                  (b?.double ?? 12) +
                  (b?.mix ?? 12) -
                  ((a?.single ?? 12) + (a?.double ?? 12) + (a?.mix ?? 12))
              )
              .slice(0, 2),
            ...meta?.competition.players
              .filter((p) => p.gender === 'F')
              .sort(
                (b, a) =>
                  (b?.single ?? 12) +
                  (b?.double ?? 12) +
                  (b?.mix ?? 12) -
                  ((a?.single ?? 12) + (a?.double ?? 12) + (a?.mix ?? 12))
              )
              .slice(0, 2)
          ];
        } else {
          bestPlayers = meta?.competition.players
            .sort(
              (b, a) =>
                (b?.single ?? 12) + (b?.double ?? 12) - ((a?.single ?? 12) + (a?.double ?? 12))
            )
            .slice(0, 4);
        }
      }

      meta.competition.teamIndex = Team.getIndexFromPlayers(
        dbTeam.type,
        bestPlayers.map((p) => {
          return {
            single: p.single,
            double: p.double,
            mix: p.mix
          };
        })
      );

      dbMembership.meta = meta;

      await dbMembership.save({ transaction });

      await transaction.commit();
      return dbTeam;
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};

export const removePlayerBaseSubEventMutation = {
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
    subEventId: {
      name: 'subEventId',
      type: GraphQLID
    }
  },
  resolve: async (
    findOptions: { [key: string]: object },
    { teamId, playerId, subEventId },
    context: { req: AuthenticatedRequest }
  ) => {
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbTeam = await Team.findByPk(teamId, { transaction });

      if (!dbTeam) {
        throw new ApiError({
          code: 404,
          message: 'Team not found'
        });
      }

      canExecute(context?.req?.user, {
        anyPermissions: [`change-base:team`]
      });

      const dbPlayer = await Player.findByPk(playerId, {
        transaction
      });

      if (!dbPlayer) {
        throw new ApiError({
          code: 404,
          message: 'Player not found'
        });
      }

      const dbMembership = await EventEntry.findOne({
        where: {
          teamId: dbTeam.id,
          subEventId
        },
        transaction
      });
      if (!dbMembership) {
        throw new ApiError({
          code: 404,
          message: 'SubEvent not found'
        });
      }

      const meta = dbMembership.meta;
      const removedPlayer = meta?.competition?.players.filter((p) => p.id === playerId)[0];
      if (!removedPlayer) {
        throw new ApiError({
          code: 404,
          message: 'Player not part of base?'
        });
      }

      meta.competition.players = meta?.competition.players.filter((p) => p.id !== playerId);

      let bestPlayers = meta?.competition.players;
      if (meta?.competition.players.length > 4) {
        if (dbTeam.type === SubEventType.MX) {
          bestPlayers = [
            ...meta?.competition.players
              .filter((p) => p.gender === 'M')
              .sort(
                (b, a) =>
                  (b?.single ?? 12) +
                  (b?.double ?? 12) +
                  (b?.mix ?? 12) -
                  ((a?.single ?? 12) + (a?.double ?? 12) + (a?.mix ?? 12))
              )
              .slice(0, 2),
            ...meta?.competition.players
              .filter((p) => p.gender === 'F')
              .sort(
                (b, a) =>
                  (b?.single ?? 12) +
                  (b?.double ?? 12) +
                  (b?.mix ?? 12) -
                  ((a?.single ?? 12) + (a?.double ?? 12) + (a?.mix ?? 12))
              )
              .slice(0, 2)
          ];
        } else {
          bestPlayers = meta?.competition.players
            .sort(
              (b, a) =>
                (b?.single ?? 12) + (b?.double ?? 12) - ((a?.single ?? 12) + (a?.double ?? 12))
            )
            .slice(0, 4);
        }
      }

      meta.competition.teamIndex = Team.getIndexFromPlayers(
        dbTeam.type,
        bestPlayers.map((p) => {
          return {
            single: p.single,
            double: p.double,
            mix: p.mix
          };
        })
      );

      dbMembership.meta = meta;

      await dbMembership.save({ transaction });

      await transaction.commit();
      return dbTeam;
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};
