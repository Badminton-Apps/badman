// We need dontenv before App!!!
import dotenv from 'dotenv';
dotenv.config();

import {
  BvlRankingCalc,
  DataBaseHandler,
  getSystemCalc,
  LastRankingPlace,
  logger,
  RankingPlace,
  RankingPoint,
  RankingSystem,
  RankingSystems,
} from '@badvlasim/shared';
import * as dbConfig from '@badvlasim/shared/database/database.config.js';
import { Transaction } from 'sequelize';
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import { copyPlaces } from '../utils';

(async () => {
  new DataBaseHandler({
    ...dbConfig.default,
    // logging: (...msg) => logger.debug('Query', msg)
  });

  let transaction = null;

  try {
    const sourceSystem = await RankingSystem.findOne({
      where: {
        name: 'BBF Rating',
      },
      transaction,
    });

    // await RankingSystem.destroy({
    //   where: {
    //     name: {
    //       [Op.not]: 'BBF Rating',
    //     },
    //   },
    //   cascade: true,
    //   transaction,
    // });

    const groups = await sourceSystem.getGroups();

    const system78weeks15games = new RankingSystem({
      ...sourceSystem.toJSON(),
      id: '79769246-5a55-4b7e-bd17-ca9ed6a13fb3',
      rankingSystem: RankingSystems.BVL,
      name: 'BFF Rating - 78 weeks - Last 15 games',
      latestXGamesToUse: 15,
      periodUnit: 'weeks',
      primary: false,
      periodAmount: 78,
      maxLevelUpPerChange: null,
      maxLevelDownPerChange: null,
    });

    const system78weeks20games = new RankingSystem({
      ...sourceSystem.toJSON(),
      id: 'd8a7a9f2-5f93-4884-83ef-6632da1dae2c',
      rankingSystem: RankingSystems.BVL,
      name: 'BFF Rating - 78 weeks - Last 20 games',
      latestXGamesToUse: 20,
      periodUnit: 'weeks',
      primary: false,
      periodAmount: 78,
      maxLevelUpPerChange: null,
      maxLevelDownPerChange: null,
    });

    const system78weeks25games = new RankingSystem({
      ...sourceSystem.toJSON(),
      id: 'd36581a8-bcd3-48d1-98f2-fd1b9adf46f3',
      rankingSystem: RankingSystems.BVL,
      name: 'BFF Rating - 78 weeks - Last 25 games',
      latestXGamesToUse: 25,
      periodUnit: 'weeks',
      primary: false,
      periodAmount: 78,
      maxLevelUpPerChange: null,
      maxLevelDownPerChange: null,
    });

    const system78weeks15games1down = new RankingSystem({
      ...sourceSystem.toJSON(),
      id: 'c327aff1-a0ba-498a-9e7b-202b1da04c65',
      rankingSystem: RankingSystems.BVL,
      name: 'BFF Rating - 78 weeks - Last 15 games - max 1 down',
      latestXGamesToUse: 15,
      periodUnit: 'weeks',
      primary: false,
      periodAmount: 78,
      maxLevelUpPerChange: null,
      maxLevelDownPerChange: 1,
    });

    const system78weeks20games1down = new RankingSystem({
      ...sourceSystem.toJSON(),
      id: '2688df19-027a-4776-a62b-9deca0cd7952',
      rankingSystem: RankingSystems.BVL,
      name: 'BFF Rating - 78 weeks - Last 20 games - max 1 down',
      latestXGamesToUse: 20,
      periodUnit: 'weeks',
      primary: false,
      periodAmount: 78,
      maxLevelUpPerChange: null,
      maxLevelDownPerChange: 1,
    });

    const system78weeks25games1down = new RankingSystem({
      ...sourceSystem.toJSON(),
      id: 'e60543e9-2b9b-424d-893a-09d37d624ed8',
      rankingSystem: RankingSystems.BVL,
      name: 'BFF Rating - 78 weeks - Last 25 games - max 1 down',
      latestXGamesToUse: 25,
      periodUnit: 'weeks',
      primary: false,
      periodAmount: 78,
      maxLevelUpPerChange: null,
      maxLevelDownPerChange: 1,
    });

    const system78weeksAllGames = new RankingSystem({
      ...sourceSystem.toJSON(),
      id: 'fb85f869-e6b3-454a-88f3-eae30a619edb',
      rankingSystem: RankingSystems.BVL,
      name: 'BFF Rating - 78 weeks',
      primary: false,
      periodUnit: 'weeks',
      periodAmount: 78,
      maxLevelUpPerChange: 1,
      maxLevelDownPerChange: 1,
    });

    const system78weeks25games1downUpDiff = new RankingSystem({
      ...sourceSystem.toJSON(),
      id: '78124a5e-7b5c-468e-be6b-47a3099d6385',
      rankingSystem: RankingSystems.BVL,
      name: 'BFF Rating - 78 weeks - Last 25 games - max 1 down - Up Diff 0',
      latestXGamesToUse: 25,
      periodUnit: 'weeks',
      primary: false,
      periodAmount: 78,
      maxLevelUpPerChange: null,
      maxLevelDownPerChange: 1,
      differenceForUpgrade: 0,
    });

    const system78weeks20games1downUpDiff = new RankingSystem({
      ...sourceSystem.toJSON(),
      id: '43f2ae74-bfe1-4b05-b4dd-bfb2c67536d1',
      rankingSystem: RankingSystems.BVL,
      name: 'BFF Rating - 78 weeks - Last 20 games - max 1 down - Up Diff 0',
      latestXGamesToUse: 20,
      periodUnit: 'weeks',
      primary: false,
      periodAmount: 78,
      maxLevelUpPerChange: null,
      maxLevelDownPerChange: 1,
      differenceForUpgrade: 0,
    });

    const system88Weeks = new RankingSystem({
      ...sourceSystem.toJSON(),
      id: '07a3c2cf-bc9e-49db-ad23-dd6641292d66',
      rankingSystem: RankingSystems.BVL,
      name: 'BFF Rating - 88 weeks',
      periodAmount: 88,
      primary: false,
    });

    const system88Weeks2YearInactive = new RankingSystem({
      ...sourceSystem.toJSON(),
      id: 'eab07d22-ae09-4009-8168-855c21ebe672',
      rankingSystem: RankingSystems.BVL,
      name: 'BFF Rating - 88 weeks - 2 years inactivity',
      periodAmount: 88,
      inactivityAmount: 24,
      inactivityUnit: 'months',
      primary: false,
    });

    const system88Weeks3YearInactive = new RankingSystem({
      ...sourceSystem.toJSON(),
      id: '0ffacd6d-cb60-4afb-997d-2d04e0be0e91',
      rankingSystem: RankingSystems.BVL,
      name: 'BFF Rating - 88 weeks - 3 years inactivity',
      periodAmount: 88,
      primary: false,
      inactivityAmount: 36,
      inactivityUnit: 'months',
    });

    const system128Weeks = new RankingSystem({
      ...sourceSystem.toJSON(),
      id: '87fb177a-d36a-4cc5-a1e0-3bc27ec06698',
      rankingSystem: RankingSystems.BVL,
      name: 'BFF Rating - 128 weeks',
      periodAmount: 128,
      primary: false,
    });

    const system128Weeks3YearInactive = new RankingSystem({
      ...sourceSystem.toJSON(),
      id: 'bc1fb79a-0251-43e7-813b-f2a22e0f7a53',
      rankingSystem: RankingSystems.BVL,
      name: 'BFF Rating - 128 weeks - 3 years inactivity ',
      periodAmount: 128,
      primary: false,
      inactivityAmount: 36,
      inactivityUnit: 'months',
    });

    const targets = [
      system88Weeks,
      system128Weeks,
      system88Weeks3YearInactive,
      system128Weeks3YearInactive,
    ];

    for (const targetSystem of targets) {
      logger.info(`Calculating ${targetSystem.name}`);
      transaction = await DataBaseHandler.sequelizeInstance.transaction();

      // Destroy old
      await destroySystem(targetSystem, transaction);

      // Create new
      const resultSystem = await RankingSystem.create(
        {
          ...targetSystem.toJSON(),
        },
        { transaction }
      );

      // Set groups
      await resultSystem.setGroups(groups, { transaction });

      await copyPlaces(sourceSystem, resultSystem, transaction);
      await calulateLastPlace(targetSystem, transaction);
      await transaction.commit();
    }
  } catch (error) {
    logger.error('something went wrong', error);
    transaction.rollback();
  }
})();

async function destroySystem(system: RankingSystem, transaction?: Transaction) {
  await RankingSystem.destroy({
    where: {
      id: system.id,
    },
    cascade: true,
    transaction,
  });

  await RankingPlace.destroy({
    where: {
      SystemId: system.id,
    },
    cascade: true,
    transaction,
  });

  await RankingPoint.destroy({
    where: {
      SystemId: system.id,
    },
    cascade: true,
    transaction,
  });

  await LastRankingPlace.destroy({
    where: {
      systemId: system.id,
    },
    cascade: true,
    transaction,
  });
}

async function calulateLastPlace(
  newSystem: RankingSystem,
  transaction: Transaction
) {
  const lastUpdate = moment();
  const originalStart = lastUpdate
    .clone()
    .subtract(newSystem.period.amount, newSystem.period.unit)
    .toDate();
  const originalEnd = lastUpdate.toDate();
  const calculator = getSystemCalc(newSystem) as BvlRankingCalc;

  const players = await calculator['getPlayersAsync'](
    originalStart,
    originalEnd,
    { transaction }
  );
  await calculator['_calculateRankingPlacesAsync'](
    originalStart,
    originalEnd,
    players,
    true,
    transaction
  );
}
