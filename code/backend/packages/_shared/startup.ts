import { DataBaseHandler } from './database';
import { logger } from './utils';
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
  let databaseService: DataBaseHandler;
  try { 
    databaseService = new DataBaseHandler(dbConfig.default);
    logger.debug('Checking Database');
    await databaseService.dbCheck(canMigrate, sync);
  } catch (error) {
    times += 1;
    logger.error('DB is not availible yet', error);
    logger.warn(`Retrying in ${1000 * times} seconds`);

    if (times < 3) {
      setTimeout(startFunction, 1000 * times);

      setTimeout(() => {
        startWhenReady(canMigrate, sync, startFunction);
      }, 1000 * times);
    } else {
      logger.error(`Something went wrong initializing`, error);
      throw new Error(error);
    }
  }

  try {
    startFunction(databaseService);
  } catch (error) {
    logger.error('Starting server failed', error);
  }
};
