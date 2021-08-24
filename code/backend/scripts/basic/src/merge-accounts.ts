import * as dbConfig from '@badvlasim/shared/database/database.config.js';
import { DataBaseHandler, Player } from '../../../packages/_shared';

(async () => {
  await merge_accounts();
})();

async function merge_accounts() {
  const databaseService = new DataBaseHandler(dbConfig.default);
  const destination = `59e8539b-2a5c-4ffd-a60b-947349fba543`;
  const sources =[
    `00ae8d83-fce3-4db1-8374-dacdd02f4ad0`,
    `8b1faa9f-22bc-4c57-9b2b-db782ef8c315`
  ];

  for (const source of sources) {
    await databaseService.mergePlayers(destination, source);
  }
}
