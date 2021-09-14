import { DataBaseHandler } from './database';
import { logger } from './utils';
// eslint-disable-next-line import/no-internal-modules
import * as dbConfig from './database/database.config.js';

let times = 0;
/**
 * Starts the server when all pre-start scripts are up and running
 *
 * @param canMigrate Allows migration of DB
 * @param sync Forces DB to recreate every table, this also adds the default Ranking System
 * @param startFunction Function to run when finished
 */
export const startWhenReady = async (
  canMigrate: boolean,
  sync: boolean,
  startFunction: (...args) => void
) => {
  const databaseService = new DataBaseHandler(dbConfig.default);

  try {
    logger.debug('Checking Database');
    await databaseService.dbCheck(canMigrate, sync);
  } catch (error) {
    times += 1;
    logger.warn('DB is not availible yet', error);
    logger.warn('retrying', 1000 * times);

    if (times < 3) {
      setTimeout(startFunction, 1000 * times);

      setTimeout(() => {
        startWhenReady(canMigrate, sync, startFunction);
      }, 1000 * times);
    } else {
      logger.error(error);
      throw new Error(error);
    }
  }

  try {
    logger.debug('Starting server');
    startFunction(databaseService);
  } catch (error) {
    logger.error('Starting server failed', error);
  }
};
