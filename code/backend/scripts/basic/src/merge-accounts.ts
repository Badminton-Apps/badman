import {
  DataBaseHandler,
  LastRankingPlace,
  logger,
  Player,
} from '@badvlasim/shared';
import * as dbConfig from '@badvlasim/shared/database/database.config.js';

(async () => {
  await merge_accounts();
})();

async function merge_accounts() {
  logger.info('Start manual merging accounts');

  const databaseService = new DataBaseHandler({
    ...dbConfig.default,
    // logging: (...msg) => logger.debug('Query', msg)
  });

  const transaction = await DataBaseHandler.sequelizeInstance.transaction();

  logger.info(`Getting players`);
  const players = await Player.findAll({
    transaction,
    include: [
      {
        model: LastRankingPlace,
        attributes: ['singlePoints', 'doublePoints', 'mixPoints'],
        required: false,
      },
    ],
  });

  const ids = players?.map((p) => p.memberId?.trim());

  // create a new (dirty) Array with only the non-unique items
  let nonUnique = ids.filter(
    (item, i) =>
      item !== null &&
      item !== undefined &&
      item.length > 1 &&
      ids.includes(item, i + 1)
  );

  // Cleanup - remove duplicate & empty items items
  nonUnique = [...new Set(nonUnique)];

  logger.info(`Found ${nonUnique.length} non-unique memberIds`);
  try {
    for (const player of nonUnique) {
      const nonUniques = players
        .filter((p) => p.memberId === player)
        .sort((a, b) => {
          return (
            (b.lastRankingPlaces?.[0]?.singlePoints ?? 0) +
            (b.lastRankingPlaces?.[0]?.doublePoints ?? 0) +
            (b.lastRankingPlaces?.[0]?.mixPoints ?? 0) -
            ((a.lastRankingPlaces?.[0]?.singlePoints ?? 0) +
              (a.lastRankingPlaces?.[0]?.doublePoints ?? 0) +
              (a.lastRankingPlaces?.[0]?.mixPoints ?? 0))
          );
        });
      const destination = nonUniques.shift();
      const sources = nonUniques.filter((p) => p.id !== destination.id);

      await databaseService.mergePlayers(destination, sources, {
        transaction,
      });
    }

    await transaction.commit();
  } catch (error) {
    logger.error('Something went wrong merging players', error);
    await transaction.rollback();
  }
}
