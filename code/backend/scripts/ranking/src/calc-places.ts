// We need dontenv before App!!!
import * as dbConfig from '@badvlasim/shared/database/database.config.js';
import dotenv from 'dotenv';
dotenv.config();

import {
  BvlRankingCalc,
  DataBaseHandler,
  getSystemCalc,
  logger,
  RankingSystem,
} from '@badvlasim/shared';

(async () => {
  new DataBaseHandler({
    ...dbConfig.default,
    // logging: (...msg) => logger.debug('Query', msg)
  });

  let transaction = null;

  try {
    transaction = await DataBaseHandler.sequelizeInstance.transaction();
    const system = await RankingSystem.findOne({
      where: {
        id: '5743f774-0865-4d55-848e-34ecab9a9bb8',
      },
      transaction,
    });
    const calculator = getSystemCalc(system) as BvlRankingCalc;

    await calculator.calculatePeriodAsync(
      new Date('2020-08-24T22:00:00.000Z'),
      new Date('2022-03-28T22:00:00.000Z'),
      true,
      {
        transaction,
      }
    );
  } catch (error) {
    logger.error('something went wrong', error);
    transaction.rollback();
  }
})();
