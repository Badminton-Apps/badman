import {
  DataBaseHandler,
  DrawTournament,
  EventEntry,
  EventTournament,
  Game,
  GameType,
  logger,
  Player,
  RankingPlace,
  RankingSystem,
  SubEventTournament,
} from '@badvlasim/shared';
import * as dbConfig from '@badvlasim/shared/database/database.config.js';
import { writeFileSync } from 'fs';
import { Op } from 'sequelize';

(async () => {
  new DataBaseHandler({
    ...dbConfig.default,
    // logging: (...msg) => logger.debug('Query', msg)
  });
  const transaction = await DataBaseHandler.sequelizeInstance.transaction();
  const primarySystem = await RankingSystem.findOne({
    attributes: ['id'],
    where: {
      primary: true,
    },
    transaction,
  });

  const subEvents = await Promise.all(
    (
      await primarySystem.getGroups()
    )?.flatMap((g) => g.getSubEventTournaments())
  );

  const tourneys = await EventTournament.findAll({
    attributes: ['id', 'firstDay', 'name'],
    transaction,
    where: {
      firstDay: {
        [Op.gte]: new Date('2020-09-09'),
      },
    },
    include: [
      {
        model: SubEventTournament,
        attributes: ['id', 'name', 'gameType'],
        required: true,
        where: {
          id: {
            [Op.in]: subEvents.flat().map((s) => s.id),
          },
          gameType: {
            [Op.in]: [GameType.D, GameType.MX],
          },
        },
        include: [
          {
            attributes: ['id'],
            model: DrawTournament,
            required: true,
            include: [
              {
                required: true,
                model: EventEntry,
                attributes: ['id', 'player1Id', 'player2Id'],
              },
            ],
          },
        ],
      },
    ],
  });

  const minFirstDay = Math.min(...tourneys.map((t) => t.firstDay.getTime()));
  const maxFirstDay = Math.max(...tourneys.map((t) => t.firstDay.getTime()));

  const playerIds = [
    ...new Set(
      tourneys.reduce((acc, t) => {
        const playerIds = t.subEvents.reduce((acc, s) => {
          const playerIds = s.draws.reduce((acc, d) => {
            const playerIds = d.entries.reduce((acc, g) => {
              acc.push(g.player1Id);
              acc.push(g.player2Id);
              return acc;
            }, []);
            return [...acc, ...playerIds];
          }, []);
          return [...acc, ...playerIds];
        }, []);
        return [...acc, ...playerIds];
      }, [])
    ),
  ];

  const playerRankings = await RankingPlace.findAll({
    attributes: ['id', 'double', 'mix', 'playerId', 'rankingDate'],
    where: {
      playerId: {
        [Op.in]: playerIds,
      },
      SystemId: primarySystem.id,
      rankingDate: {
        [Op.between]: [new Date(minFirstDay), new Date(maxFirstDay)],
      },
    },
    order: [['rankingDate', 'ASC']],
    transaction,
  });

  const result_set: {
    D: { [key: string]: number };
    MX: { [key: string]: number };
  } = {
    D: {},
    MX: {},
  };

  writeFileSync('tourneys.csv', tourneys?.map((r) => r.name).join('\n'), {
    flag: 'w',
  });
  for (const tourney of tourneys) {
    const tourLogger = logger.child({ label: tourney.name });

    function getFormat(p1: RankingPlace, p2: RankingPlace, gameType: GameType) {
      if (gameType == GameType.D) {
        if (Math.abs(p1.double - p2.double) > 3) {
          tourLogger.debug(
            `Big difference for ${p1.playerId} and ${p2.playerId}`
          );
        }
        if (p1.double < p2.double) {
          return `${p1.double}-${p2.double}`;
        } else {
          return `${p2.double}-${p1.double}`;
        }
      } else {
        if (Math.abs(p1.mix - p2.mix) > 3) {
          tourLogger.debug(
            `Big difference for ${p1.playerId} and ${p2.playerId}`
          );
        }
        if (p1.mix < p2.mix) {
          return `${p1.mix}-${p2.mix}`;
        } else {
          return `${p2.mix}-${p1.mix}`;
        }
      }
    }

    // percentage of tournaments
    const percentage = (tourneys.indexOf(tourney) / tourneys.length) * 100;
    logger.info(`${percentage.toFixed(2)}% ${tourney.name}`);

    for (const subEvent of tourney.subEvents) {
      for (const draw of subEvent.draws) {
        for (const entry of draw.entries) {
          const t1p1 = playerRankings.find(
            (r) =>
              r.playerId === entry.player1Id && r.rankingDate > tourney.firstDay
          );
          const t1p2 = playerRankings.find(
            (r) =>
              r.playerId === entry.player2Id && r.rankingDate > tourney.firstDay
          );

          if (t1p1 && t1p2) {
            const format1 = getFormat(t1p1, t1p2, subEvent.gameType);

            // get the item from the result set or create new instance
            const item = result_set[subEvent.gameType];

            // increase the count for each format
            item[format1] = (item[format1] || 0) + 1;

            // Update the result set
            result_set[subEvent.gameType] = {
              ...result_set[subEvent.gameType],
              ...item,
            };
          }
        }
      }
    }

    // convert resultset to CSV array
    const csv = ['Type,P1,P2,Diff,Count'];
    for (const format in result_set.D) {
      const [p1, p2] = format.split('-');
      csv.push(
        `D,${p1},${p2},${parseInt(p1, 10) - parseInt(p2, 10)},${
          result_set.D[format]
        }`
      );
    }
    for (const format in result_set.MX) {
      const [p1, p2] = format.split('-');
      csv.push(
        `MX,${p1},${p2},${parseInt(p1, 10) - parseInt(p2, 10)},${
          result_set.MX[format]
        }`
      );
    }

    writeFileSync('results.csv', csv.join('\n'), { flag: 'w' });
  }

  logger.info(`Found ${playerIds.length} players`);

  try {
    await transaction.commit();
  } catch (error) {
    logger.error('something went wrong', error);
    transaction.rollback();
  }
})();
