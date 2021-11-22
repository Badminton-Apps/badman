import * as dbConfig from '@badvlasim/shared/database/database.config.js';
import { DataBaseHandler, Player } from '../../../packages/_shared';

(async () => {
  await merge_accounts();
})();

async function merge_accounts() {
  const databaseService = new DataBaseHandler(dbConfig.default);
  let destination = `d0bb547a-1873-49ce-a58b-9bb0c59e692b`;
  let sources = [`2517a521-74dc-4305-baa7-a394dc46558d`, `edb89977-633e-4f8c-b8ab-de2b77b27315`];

  for (const source of sources) {
    await databaseService.mergePlayers(destination, source);
  }

  // destination = `6d84dbd6-7c53-49d9-a84e-5eea17010e5a`;
  // sources = [
  //   `523cff7c-b826-45d7-9c99-14d9a76c8d04`,
  //   `d2bff236-f2a7-4a73-805b-699b0b40292f`,
  //   `d2e3be99-48d1-42ca-a7c2-266eae889888`
  // ];

  // for (const source of sources) {
  //   await databaseService.mergePlayers(destination, source);
  // }
}
