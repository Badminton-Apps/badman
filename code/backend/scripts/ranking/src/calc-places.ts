// We need dontenv before App!!!
import * as dbConfig from '@badvlasim/shared/database/database.config.js';
import dotenv from 'dotenv';
dotenv.config();

import {
  BvlRankingCalc,
  DataBaseHandler,
  getSystemCalc,
  logger,
  RankingPlace,
  RankingPoint,
  RankingSystem,
} from '@badvlasim/shared';
import { Op } from 'sequelize';
import moment from 'moment';
import { copyPlaces } from '../utils';

(async () => {
  new DataBaseHandler({
    ...dbConfig.default,
    // logging: (...msg) => logger.debug('Query', msg)
  });

  let transaction = null;
  const includeCopy = true;

  try {
    transaction = await DataBaseHandler.sequelizeInstance.transaction();
    const resultSystem = await RankingSystem.findOne({
      where: {
        id: '5743f774-0865-4d55-848e-34ecab9a9bb8',
      },
      transaction,
    });

    if (includeCopy) {
      // For a clean start, copy all places from source to result
      const sourceSystem = await RankingSystem.findOne({
        where: {
          id: '934116c8-ee7e-4f3c-9c8b-6de579c3686f',
        },
      });
      await copyPlaces(sourceSystem, resultSystem, undefined);
    }

    // Setup
    const startDate = moment('2020-09-08T22:00:00.000Z');
    const endDate = startDate.clone();
    endDate.add(resultSystem.periodAmount, resultSystem.periodUnit);

    resultSystem.caluclationIntervalLastUpdate = startDate.toDate();
    resultSystem.updateIntervalAmountLastUpdate = startDate.toDate();
    await resultSystem.save({ transaction });

    // Calc
    const calculator = getSystemCalc(resultSystem) as BvlRankingCalc;
    await RankingPoint.destroy({
      where: {
        SystemId: resultSystem.id,
        rankingDate: {
          [Op.gte]: startDate.toDate(),
        },
      },
      transaction,
    });

    await RankingPlace.destroy({
      where: {
        SystemId: resultSystem.id,
        rankingDate: endDate.toDate(),
      },
      transaction,
    });

    await calculator.calculatePeriodAsync(
      startDate.toDate(),
      endDate.toDate(),
      true,
      {
        transaction,
      }
    );

    resultSystem.caluclationIntervalLastUpdate = endDate.toDate();
    resultSystem.updateIntervalAmountLastUpdate = endDate.toDate();
    await resultSystem.save({ transaction });

    logger.debug('Done');
    await transaction.commit();
  } catch (error) {
    logger.error('something went wrong', error);
    transaction.rollback();
  }
})();
