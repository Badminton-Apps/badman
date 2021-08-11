import * as dbConfig from '@badvlasim/shared/database/database.config.js';
import { Op } from 'sequelize';
import { acceptDate } from '../../../packages/server/src/graphql';
import {
  DataBaseHandler,
  EncounterCompetition,
  logger
} from '../../../packages/_shared';

(async () => {
  new DataBaseHandler({
    ...dbConfig.default
    // logging: (...msg) => logger.debug('Query', msg)
  });

  const transaction = await DataBaseHandler.sequelizeInstance.transaction();

  const encounters = await EncounterCompetition.findAll({
    where: {
      originalDate: { [Op.not]: null }
    },
    transaction
  });
  try {
    for (const encounter of encounters) {
      await acceptDate(encounter, transaction);

      // Destroy the requets
      await encounter.destroy({ transaction });
    }
    throw 'lol';
    await transaction.commit();
  } catch (e) {
    logger.error(e);
    await transaction.rollback();
  }
})();
