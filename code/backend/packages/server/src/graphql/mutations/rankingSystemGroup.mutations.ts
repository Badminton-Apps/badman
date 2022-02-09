import {
  ApiError,
  AuthenticatedRequest,
  canExecute,
  DataBaseHandler,
  DrawCompetition,
  DrawTournament,
  EncounterCompetition,
  Game,
  GamePlayer,
  getSystemCalc,
  logger,
  Player,
  RankingPlace,
  RankingPoint,
  RankingSystemGroup,
  StartVisualRankingDate
} from '@badvlasim/shared';
import { GraphQLID, GraphQLList, GraphQLNonNull } from 'graphql';
import { Op, Transaction } from 'sequelize';
import { RankingSystemGroupInputType, RankingSystemGroupType } from '../types';

export const addRankingSystemGroupMutation = {
  type: RankingSystemGroupType,
  args: {
    rankingSystemGroup: {
      name: 'RankingSystemGroup',
      type: RankingSystemGroupInputType
    }
  },
  resolve: async (
    findOptions: { [key: string]: object },
    { rankingSystemGroup },
    context: { req: AuthenticatedRequest }
  ) => {
    canExecute(context?.req?.user, {
      anyPermissions: ['add:ranking-group']
    });

    return RankingSystemGroup.create(rankingSystemGroup);
  }
};

export const updateRankingSystemGroupMutation = {
  type: RankingSystemGroupType,
  args: {
    rankingSystemGroup: {
      name: 'RankingSystemGroup',
      type: RankingSystemGroupInputType
    }
  },
  resolve: async (
    findOptions: { [key: string]: object },
    { rankingSystemGroup }: { rankingSystemGroup: Partial<RankingSystemGroup> },
    context: { req: AuthenticatedRequest }
  ) => {
    canExecute(context?.req?.user, { anyPermissions: ['edit:ranking-group'] });

    const dbRankingSystemGroup = await RankingSystemGroup.findByPk(rankingSystemGroup.id);

    if (!dbRankingSystemGroup) {
      throw new ApiError({
        code: 404,
        message: 'Player not found'
      });
    }

    dbRankingSystemGroup.name = rankingSystemGroup.name;
    await dbRankingSystemGroup.save();

    return dbRankingSystemGroup;
  }
};

export const addSubEventToRankingSystemGroupMutation = {
  type: RankingSystemGroupType,
  args: {
    rankingSystemGroupId: {
      name: 'rankingSystemGroupId',
      type: new GraphQLNonNull(GraphQLID)
    },
    competitions: {
      name: 'competitions',
      type: new GraphQLList(new GraphQLNonNull(GraphQLID))
    },
    tournaments: {
      name: 'tournaments',
      type: new GraphQLList(new GraphQLNonNull(GraphQLID))
    }
  },
  resolve: async (
    findOptions: { [key: string]: object },
    {
      rankingSystemGroupId,
      competitions,
      tournaments
    }: {
      rankingSystemGroupId: string;
      competitions?: string[];
      tournaments?: string[];
    },
    context: { req: AuthenticatedRequest }
  ) => {
    canExecute(context?.req?.user, { anyPermissions: ['add:event'] });

    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbRankingSystemGroup = await RankingSystemGroup.findByPk(rankingSystemGroupId, {
        transaction
      });

      if (!dbRankingSystemGroup) {
        throw new ApiError({
          code: 404,
          message: 'dbRankingSystemGroup not found'
        });
      }

      if (competitions) {
        await dbRankingSystemGroup.addSubEventCompetitions(competitions, { transaction });
        await addGamePointsForSubEvents(dbRankingSystemGroup, competitions, transaction);
      }

      if (tournaments) {
        await dbRankingSystemGroup.addSubEventTournaments(tournaments, { transaction });
        await addGamePointsForSubEvents(dbRankingSystemGroup, tournaments, transaction);
      }

      logger.debug(
        `Added ${competitions?.length || 0} subEvents competitions and ${
          tournaments?.length || 0
        } subEvents tournaments`
      );

      await transaction.commit();
      return dbRankingSystemGroup;
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};

export const removeSubEventToRankingSystemGroupMutation = {
  type: RankingSystemGroupType,
  args: {
    rankingSystemGroupId: {
      name: 'rankingSystemGroupId',
      type: new GraphQLNonNull(GraphQLID)
    },
    competitions: {
      name: 'competitions',
      type: new GraphQLList(new GraphQLNonNull(GraphQLID))
    },
    tournaments: {
      name: 'tournaments',
      type: new GraphQLList(new GraphQLNonNull(GraphQLID))
    }
  },
  resolve: async (
    findOptions: { [key: string]: object },
    {
      rankingSystemGroupId,
      competitions,
      tournaments
    }: {
      rankingSystemGroupId: string;
      competitions?: string[];
      tournaments?: string[];
    },
    context: { req: AuthenticatedRequest }
  ) => {
    canExecute(context?.req?.user, { anyPermissions: ['remove:event'] });

    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbRankingSystemGroup = await RankingSystemGroup.findByPk(rankingSystemGroupId, {
        transaction
      });

      if (!dbRankingSystemGroup) {
        throw new ApiError({
          code: 404,
          message: 'dbRankingSystemGroup not found'
        });
      }

      if (competitions) {
        await dbRankingSystemGroup.removeSubEventCompetitions(competitions, { transaction });
        await removeGamePointsForSubEvents(dbRankingSystemGroup, competitions, transaction);
      }

      if (tournaments) {
        await dbRankingSystemGroup.removeSubEventTournaments(tournaments, { transaction });
        await removeGamePointsForSubEvents(dbRankingSystemGroup, tournaments, transaction);
      }

      logger.debug(
        `Removed ${competitions?.length || 0} subEvents competitions and ${
          tournaments?.length || 0
        } subEvents tournaments`
      );

      await transaction.commit();
      return dbRankingSystemGroup;
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};

export const addGamePointsForSubEvents = async (
  group: RankingSystemGroup,
  subEvents: string[],
  transaction: Transaction
) => {
  const systems = await group.getSystems({ transaction });

  for (const system of systems) {
    const tournamentGames = await Game.findAll({
      transaction,
      where: {
        playedAt: {
          [Op.gte]: StartVisualRankingDate
        }
      },
      include: [
        {
          model: DrawTournament,
          required: true,
          where: { subeventId: { [Op.in]: [...subEvents.map((subEvent) => subEvent)] } }
        },
        {
          model: RankingPoint,
          attributes: ['id'],
          required: false,
          where: { SystemId: system.id }
        },
        {
          model: Player,
          attributes: ['id']
        }
      ]
    });

    const competitionGames = await Game.findAll({
      transaction,
      where: {
        playedAt: {
          [Op.gte]: StartVisualRankingDate
        }
      },
      include: [
        {
          model: EncounterCompetition,
          required: true,
          include: [
            {
              model: DrawCompetition,
              required: true,
              where: { subeventId: { [Op.in]: [...subEvents.map((subEvent) => subEvent)] } }
            }
          ]
        },
        {
          model: RankingPoint,
          attributes: ['id'],
          required: false,
          where: { SystemId: system.id }
        },
        {
          model: Player,
          attributes: ['id']
        }
      ]
    });

    const games = [...tournamentGames, ...competitionGames];

    await RankingPoint.destroy({
      transaction,
      where: { SystemId: system.id, GameId: { [Op.in]: [...games.map((game) => game.id)] } }
    });

    const gamePlayers = await GamePlayer.findAll({
      where: {
        gameId: {
          [Op.in]: games.map((game) => game.id)
        }
      },
      transaction: transaction
    });
    const players = await Player.findAll({
      where: {
        id: {
          [Op.in]: gamePlayers.map((gp) => gp.playerId)
        }
      },
      include: [
        {
          required: false,
          model: RankingPlace,
          where: {
            SystemId: system.id
          }
        }
      ],
      transaction: transaction
    });

    const hash = new Map<string, Player>(players.map((e) => [e.id, e]));

    logger.debug(`Adding points for ${games.length} games in system ${system.name}(${system.id})`);

    await getSystemCalc(system).calculateRankingPointsPerGameAsync(
      games,
      hash,
      null,
      transaction
    );
  }
};

const removeGamePointsForSubEvents = async (
  group: RankingSystemGroup,
  subEvents: string[],
  transaction: Transaction
) => {
  const systems = await group.getSystems({ transaction });

  for (const system of systems) {
    const tournamentGames = await Game.findAll({
      transaction,
      include: [
        {
          model: DrawTournament,
          required: true,
          where: { subeventId: { [Op.in]: [...subEvents.map((subEvent) => subEvent)] } }
        }
      ]
    });

    const competitionGames = await Game.findAll({
      transaction,
      include: [
        {
          model: EncounterCompetition,
          required: true,
          include: [
            {
              model: DrawCompetition,
              required: true,
              where: { subeventId: { [Op.in]: [...subEvents.map((subEvent) => subEvent)] } }
            }
          ]
        }
      ]
    });

    const games = [...tournamentGames, ...competitionGames];

    await RankingPoint.destroy({
      transaction,
      where: { SystemId: system.id, GameId: { [Op.in]: [...games.map((game) => game.id)] } }
    });

    logger.debug(`Removed points for ${games.length} games in system ${system.name}(${system.id})`);
  }
};
