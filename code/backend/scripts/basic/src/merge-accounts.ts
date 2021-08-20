import * as dbConfig from '@badvlasim/shared/database/database.config.js';
import { DataBaseHandler, Player } from '../../../packages/_shared';

const MEMBER_1 = `12201a43-e561-4f20-9721-36d6c37df38c`;
const MEMBER_2 = `c2eb311f-7134-4214-80ff-67b9922de21a`;

(async () => {
  await merge_accounts();
})();

async function merge_accounts() {
    const databaseService = new DataBaseHandler(dbConfig.default);

    await databaseService.mergePlayers(MEMBER_1, MEMBER_2);

}
