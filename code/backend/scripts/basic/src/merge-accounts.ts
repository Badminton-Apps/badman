import * as dbConfig from '@badvlasim/shared/database/database.config.js';
import { DataBaseHandler, Player } from '../../../packages/_shared';

(async () => {
  await merge_accounts();
})();

async function merge_accounts() {
  const databaseService = new DataBaseHandler(dbConfig.default);
  const destination = `2517a521-74dc-4305-baa7-a394dc46558d`;
  const sources = [`4ca337b5-06fe-4653-adc0-49e78448d4ee`];

  for (const source of sources) {
    await databaseService.mergePlayers(destination, source);
  }
}

