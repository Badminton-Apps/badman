import * as dbConfig from '@badvlasim/shared/database/database.config.js';
import { DataBaseHandler, Player } from '../../../packages/_shared';

(async () => {
  await merge_accounts();
})();

async function merge_accounts() {
  const databaseService = new DataBaseHandler(dbConfig.default);
  const destination = `75dc3dbe-14bb-482c-8fc9-c7de72518d47`;
  const source = `d794e1ac-6f7f-4c4a-b292-f371c4d90c69`;

  await databaseService.mergePlayers(destination, source);
}
