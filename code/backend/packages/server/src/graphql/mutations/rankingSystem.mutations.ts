import {
  AuthenticatedRequest,
  canExecute,
  DataBaseHandler,
  DrawCompetition,
  DrawTournament,
  EncounterCompetition,
  Game,
  GamePlayer,
  GroupSystems,
  logger,
  Player,
  RankingPlace,
  getSystemCalc,
  RankingSystem,
  RankingSystemGroup,
  StartVisualRankingDate,
  SubEventCompetition,
  SubEventTournament
} from '@badvlasim/shared';
import { Op } from 'sequelize';
import { RankingSystemInputType, RankingSystemType } from '../types';

export const addRankingSystemMutation = {
  type: RankingSystemType,
  args: {
    rankingSystem: {
      name: 'RankingSystem',
      type: RankingSystemInputType
    }
  },
  resolve: async (
    findOptions: { [key: string]: object },
    { rankingSystem: rankingSystemInput },
    context: { req: AuthenticatedRequest }
  ) => {
    canExecute(context?.req?.user, {
      anyPermissions: ['add:ranking']
    });

    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const { groups, ...rankingSystem } = rankingSystemInput;
      const systemDb = await RankingSystem.create(rankingSystem, { transaction });

      for (const group of groups) {
        const dbGroup = await RankingSystemGroup.findByPk(group.id);
        await systemDb.addGroup(dbGroup, { transaction });
      }

      logger.debug('Added');

      await transaction.commit();
      return systemDb;
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};

export const updateRankingSystemMutation = {
  type: RankingSystemType,
  args: {
    rankingSystem: {
      name: 'RankingSystem',
      type: RankingSystemInputType
    }
  },
  resolve: async (
    findOptions: { [key: string]: object },
    { rankingSystem },
    context: { req: AuthenticatedRequest }
  ) => {
    canExecute(context?.req?.user, { anyPermissions: ['edit:ranking'] });

    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      await RankingSystem.update(rankingSystem, {
        where: { id: rankingSystem.id },
        transaction
      });

      // Destroy existing
      await GroupSystems.destroy({ where: { systemId: rankingSystem.id }, transaction });
      // Create new
      await GroupSystems.bulkCreate(
        rankingSystem.groups?.map((g) => {
          return {
            systemId: rankingSystem.id,
            groupId: g.id
          };
        }),
        { transaction }
      );

      const dbEvent = await RankingSystem.findByPk(rankingSystem.id, {
        include: [{ model: RankingSystemGroup, attributes: ['id', 'name'] }],
        transaction
      });

      await transaction.commit();
      return dbEvent;
    } catch (e) {
      logger.error('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};
async function setPointsForSystem(transaction, systemDb: RankingSystem) {
  logger.debug('Set points for system');
  const groups = await systemDb.getGroups({
    include: [
      {
        model: SubEventCompetition
      },
      {
        model: SubEventTournament
      }
    ],
    transaction
  })

  const subEventsTournament = groups.filter((g) => g.subEventTournaments.length > 0).map(g => g.subEventTournaments).flat();
  const subEventsCompetition = groups.filter((g) => g.subEventCompetitions.length > 0).map(g => g.subEventCompetitions).flat()

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
        where: { subeventId: { [Op.in]: [...subEventsTournament.map((subEvent) => subEvent.id)] } }
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
            where: { subeventId: { [Op.in]: [...subEventsCompetition.map((subEvent) => subEvent.id)] } }
          }
        ]
      },
      {
        model: Player,
        attributes: ['id']
      }
    ]
  });

  const gamePlayers = await GamePlayer.findAll({
    where: {
      gameId: {
        [Op.in]: [...tournamentGames, ...competitionGames].map((game) => game.id)
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
          SystemId: systemDb.id
        }
      }
    ],
    transaction: transaction
  });

  const hash = new Map<string, Player>(players.map((e) => [e.id, e]));

  await getSystemCalc(systemDb).calculateRankingPointsPerGameAsync(
    [...tournamentGames, ...competitionGames],
    hash,
    null,
    transaction
  );
}
