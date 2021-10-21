import * as dbConfig from '@badvlasim/shared/database/database.config.js';
import { DataBaseHandler, Player } from '../../../packages/_shared';

(async () => {
  await merge_accounts();
})();

async function merge_accounts() {
  const databaseService = new DataBaseHandler(dbConfig.default);
  let destination = `f99f9769-e85a-472c-8eed-b4d0b974c5e7`;
  let sources = [`8bab3915-4b3d-43ac-beff-42f055804947`];

  for (const source of sources) {
    await databaseService.mergePlayers(destination, source);
  }

  destination = `6d84dbd6-7c53-49d9-a84e-5eea17010e5a`;
  sources = [
    `523cff7c-b826-45d7-9c99-14d9a76c8d04`,
    `d2bff236-f2a7-4a73-805b-699b0b40292f`,
    `d2e3be99-48d1-42ca-a7c2-266eae889888`
  ];

  for (const source of sources) {
    await databaseService.mergePlayers(destination, source);
  }
}
