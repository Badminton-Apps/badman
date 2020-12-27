import { DataBaseHandler } from './database';
import { logger } from './utils';
// eslint-disable-next-line import/no-internal-modules
import * as dbConfig from './database/database.config.js';

let times = 0;

export const startWhenReady = async (
  canMigrate: boolean,
  startFunction: (...args) => void
) => {
  const databaseService = new DataBaseHandler(dbConfig.default);

  try {
    logger.debug('Checking Database');
    await databaseService.dbCheck(canMigrate);
  } catch (error) {
    times += 1;
    logger.warn('DB is not availible yet', error);
    logger.warn('retrying', 1000 * times);

    if (times < 3) {
      setTimeout(startFunction, 1000 * times);

      setTimeout(() => {
        startWhenReady(canMigrate, startFunction);
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
