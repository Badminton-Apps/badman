import * as dbConfig from '@badvlasim/shared/database/database.config.js';
import { DataBaseHandler, logger } from '@badvlasim/shared';

(async () => {
  await merge_accounts();
})();

async function merge_accounts() {
  logger.info('Start manual merging accounts');

  // const databaseService = new DataBaseHandler(dbConfig.default);
  // const transaction = await DataBaseHandler.sequelizeInstance.transaction();

  // try {
  //   let destination = `c57ed8da-fd1e-4fbe-be14-484208b6bb5d`;
  //   let sources = [`6bab7042-e545-4c05-9f8b-7cfd8f357640`];

  //   for (const source of sources) {
  //     await databaseService.mergePlayers(destination, source, { transaction });
  //   }

  //   destination = `fc1bec5d-21e5-4dfe-a7c4-03460239aaca`;
  //   sources = [`94c3244c-f9fe-4575-b675-9937d533be8b`];

  //   for (const source of sources) {
  //     await databaseService.mergePlayers(destination, source, { transaction });
  //   }

  //   destination = `4ee4f638-46e8-426d-9576-f23e502371b2`;
  //   sources = [`193c4346-ac5b-415f-95d1-08990e9725f8`];

  //   for (const source of sources) {
  //     await databaseService.mergePlayers(destination, source, { transaction });
  //   }
  //   await transaction.commit();
  // } catch (err) {
  //   logger.error('Something went wrong merging players');
  //   await transaction.rollback();
  //   throw err;
  // }
}
