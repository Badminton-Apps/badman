import { DataBaseHandler, EventEntry, logger, Meta, Team } from '@badvlasim/shared';
import * as dbConfig from '@badvlasim/shared/database/database.config.js';
import { Op } from 'sequelize';

(async () => {
  new DataBaseHandler({
    ...dbConfig.default,
    // logging: (...msg) => logger.debug('Query', msg)
  });

  const transaction = await DataBaseHandler.sequelizeInstance.transaction();
  try {
    const entries = await EventEntry.findAll({
      where: {
        meta: {
          [Op.ne]: null,
        },
        entryType: 'competition',
      },
      transaction,
    });
    logger.debug(`Found ${entries.length} entries`);

    for (const entry of entries) {
      const metaString = entry.meta as string | Meta;
      if (typeof metaString === 'string') {
        entry.meta = JSON.parse(entry.meta as string);
        await entry.save({ transaction });
      }
    }

    await transaction.commit();
    logger.debug('Finished');
  } catch (error) {
    logger.error('something went wrong', error);
    await transaction.rollback();
  }
})();
