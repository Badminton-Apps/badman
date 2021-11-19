import * as dbConfig from '@badvlasim/shared/database/database.config.js';
import {
  Claim,
  Club,
  DataBaseHandler,
  logger,
  Player,
  Role,
  Team
} from '@badvlasim/shared';

(async () => {
  new DataBaseHandler({
    ...dbConfig.default
    // logging: (...msg) => logger.debug('Query', msg)
  });

  const transaction = await DataBaseHandler.sequelizeInstance.transaction();

  try {
    

    await transaction.commit();
  } catch (error) {
    logger.debug('something went wrong', error);
    transaction.rollback();
  }
})();
