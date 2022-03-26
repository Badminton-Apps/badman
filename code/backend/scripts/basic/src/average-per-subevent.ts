import {
  DataBaseHandler,
  logger,
  EventCompetition,
  SubEventCompetition,
  DrawCompetition,
  EncounterCompetition,
  Game,
  LastRankingPlace,
  Player,
  RankingSystem,
} from '@badvlasim/shared';
import * as dbConfig from '@badvlasim/shared/database/database.config.js';
import { writeFile } from 'fs/promises';
import { Op } from 'sequelize';

(async () => {
  new DataBaseHandler({
    ...dbConfig.default,
    // logging: (...msg) => logger.debug('Query', msg)
  });

  try {
    const ranking = await RankingSystem.findOne({
      attributes: ['id'],
      where: {
        primary: true,
      },
    });

    await calculateAverages('PBO competitie 2021-2022', ranking);
    await calculateAverages('PBA competitie 2021-2022', ranking);

    logger.info('done');
  } catch (error) {
    logger.error('something went wrong', error);
  }
})();

function average(places: LastRankingPlace[], players: Player[]) {
  let singleWeighted = 0;
  let mixWeighted = 0;
  let doubleWeighted = 0;

  const weightedRanking = players.reduce(
    (acc, player) => {
      const lastRankingPlace = places.filter(
        (p) => p.playerId === player.id
      )[0];

      if (lastRankingPlace) {
        if (lastRankingPlace.single) {
          acc.single += lastRankingPlace.single;
          singleWeighted++;
        }
        if (lastRankingPlace.mix) {
          acc.mix += lastRankingPlace.mix;
          mixWeighted++;
        }
        if (lastRankingPlace.double) {
          acc.double += lastRankingPlace.double;
          doubleWeighted++;
        }
      }

      return acc;
    },
    {
      single: 0,
      double: 0,
      mix: 0,
    }
  );

  return {
    single: (weightedRanking.single / singleWeighted).toFixed(2),
    double: (weightedRanking.double / doubleWeighted).toFixed(2),
    mix: (weightedRanking.mix / mixWeighted).toFixed(2),
  };
}

async function calculateAverages(name: string, ranking: RankingSystem) {
  const event = await EventCompetition.findOne({
    attributes: ['id'],
    plain: true,
    where: {
      name,
    },
    include: [
      {
        model: SubEventCompetition,
        attributes: ['id', 'level', 'eventType'],

        include: [
          {
            model: DrawCompetition,
            attributes: ['id'],
            include: [
              {
                model: EncounterCompetition,
                attributes: ['id'],
                include: [
                  {
                    attributes: ['id', 'gameType', 'order'],
                    model: Game,
                    include: [
                      {
                        model: Player,
                        attributes: ['id', 'gender'],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });

  const playersPerSubEvent = event.subEvents.flatMap((s) =>
    s.draws.flatMap((d) =>
      d.encounters.flatMap((e) =>
        e.games.flatMap((g) => g.players.flatMap((p) => p as Player))
      )
    )
  );

  const players = await LastRankingPlace.findAll({
    attributes: ['id', 'playerId', 'single', 'mix', 'double'],
    where: {
      playerId: {
        [Op.in]: playersPerSubEvent.map((r) => r.id),
      },
      systemId: ranking.id,
    },
  });

  const subEvents = new Map<
    string,
    { single: string; double: string; mix: string }
  >();
  const subEventsW = new Map<
    string,
    { single: string; double: string; mix: string }
  >();

  const subEventsSorted = event.subEvents.sort((a, b) => {
    if (a.eventType === b.eventType) {
      return a.level - b.level;
    }

    return a.eventType.localeCompare(b.eventType);
  });
  for (const subevent of subEventsSorted) {
    const playersPerSubEvent = subevent.draws.flatMap((d) =>
      d.encounters.flatMap((e) =>
        e.games.flatMap((g) => g.players.flatMap((p) => p as Player))
      )
    );

    if (playersPerSubEvent.find((p) => p.gender === 'M')) {
      subEventsW.set(
        `${subevent.level} ${subevent.eventType} Male`,
        average(
          players,
          playersPerSubEvent.filter((p) => p.gender === 'M')
        )
      );
    }

    if (playersPerSubEvent.find((p) => p.gender === 'F')) {
      subEventsW.set(
        `${subevent.level} ${subevent.eventType} Female`,
        average(
          players,
          playersPerSubEvent.filter((p) => p.gender === 'F')
        )
      );
    }

    // const gameTypes = subevent.draws.flatMap((d) =>
    //   d.encounters.flatMap((e) => e.games.map((g) => g.gameType))
    // );
    // for (const gameType of gameTypes) {
    //   const playersPerSubEventPerOrder = subevent.draws.flatMap((d) =>
    //     d.encounters.flatMap((e) =>
    //       e.games.flatMap((g) => g.players.flatMap((p) => p as Player))
    //     )
    //   );
    // }
  }

  await writeFile(
    `avg-level-${name}.json`,
    JSON.stringify(
      { ...Object.fromEntries(subEvents), ...Object.fromEntries(subEventsW) },
      null,
      2
    ),
    {
      flag: 'w',
    }
  );
}
