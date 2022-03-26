import {
  DataBaseHandler,
  logger,
  Club,
  LastRankingPlace,
  Player,
  RankingSystem,
  Game,
  EncounterCompetition,
  DrawCompetition,
  SubEventCompetition,
  GamePlayer,
} from '@badvlasim/shared';
import * as dbConfig from '@badvlasim/shared/database/database.config.js';
import { writeFile } from 'fs/promises';
import { Op } from 'sequelize';
import { readFileSync } from 'fs';

(async () => {
  new DataBaseHandler({
    ...dbConfig.default,
    // logging: (...msg) => logger.debug('Query', msg)
  });

  try {
    const dataArray = JSON.parse(readFileSync('results.json', 'utf-8'))
    const ranking = await RankingSystem.findOne({
      attributes: ['id'],
      where: {
        primary: true,
      },
    });

    const club = await Club.findOne({
      attributes: [],
      where: {
        name: 'Smash For Fun',
      },
      include: [
        {
          model: Player,
          attributes: ['id', 'firstName', 'lastName'],
          include: [
            {
              model: Game,
              attributes: [
                'id',
                'set1Team1',
                'set1Team2',
                'set2Team1',
                'set2Team2',
                'set3Team1',
                'set3Team2',
                'gameType',
                'order',
                'winner',
              ],
              where: {
                playedAt: { [Op.gte]: '2021-09-01' },
                linkType: 'competition',
              },
              include: [
                {
                  model: EncounterCompetition,
                  attributes: ['id'],
                  include: [
                    {
                      model: DrawCompetition,
                      attributes: ['id'],
                      include: [
                        {
                          model: SubEventCompetition,
                          attributes: ['id', 'level', 'eventType'],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              model: LastRankingPlace,
              attributes: ['id', 'single', 'double', 'mix'],
              where: {
                systemId: ranking.id,
              },
            },
          ],
        },
      ],
    });

    for (const player of club.players) {
      const gamesPerSubEvent = player.games.reduce(
        (acc, game) => {
          const subEvent = game?.competition?.draw?.subEvent;
          if (!subEvent) {
            return acc;
          }

          const type = `${subEvent.level} ${subEvent.eventType}`;

          acc[type] = (acc[type] ?? []).concat(game);

          return acc;
        },
        {} as {
          [key: string]: (Game & {
            GamePlayer: GamePlayer;
          })[];
        }
      );

      logger.debug(`\nplayer: ${player.fullName}`);
      for (const [type, games] of Object.entries(gamesPerSubEvent)) {
        const groupByOrder = games.reduce(
          (acc, game) => {
            const order = `${game.gameType} ${game.order}`;
            acc[order] = (acc[order] ?? []).concat(game);
            return acc;
          },
          {} as {
            [key: string]: (Game & {
              GamePlayer: GamePlayer;
            })[];
          }
        );

        for (const [order, games] of Object.entries(groupByOrder)) {
          const gamesWon = games.filter((g) => g.winner === g.GamePlayer.team);
          const percentageWon = (gamesWon.length / games.length) * 100;
          logger.debug(
            `    ${order}: ${gamesWon.length} / ${
              games.length
            } (${percentageWon.toFixed(2)}%)`
          );
        }
      }
    }

    // await writeFile(`avg-level-${event.name}.json`, JSON.stringify([], null, 2), {
    //   flag: 'w',
    // });

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
