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

    const system4 = new RankingSystem({
      ...sourceSystem.toJSON(),
      id: 'dc86af6b-9e78-4d73-bcf5-829dd79a6a89',
      rankingSystem: RankingSystems.BVL,
      name: 'BFF Rating - 52 weeks - Last 20 games',
      latestXGamesToUse: 20,
      periodUnit: 'weeks',
      periodAmount: 52,
      primary: false,
      maxLevelUpPerChange: null,
      maxLevelDownPerChange: null,
    });

    const system5 = new RankingSystem({
      ...sourceSystem.toJSON(),
      id: '6c76a18a-ed0d-4c30-9527-c40cf0554ed6',
      rankingSystem: RankingSystems.BVL,
      name: 'BFF Rating - 52 weeks - Last 15 games',
      latestXGamesToUse: 15,
      periodUnit: 'weeks',
      primary: false,
      periodAmount: 52,
      maxLevelUpPerChange: null,
      maxLevelDownPerChange: null,
    });

    const system6 = new RankingSystem({
      ...sourceSystem.toJSON(),
      id: 'a6792053-6b2c-4044-9f9c-f16247f3a63c',
      rankingSystem: RankingSystems.BVL,
      name: 'BFF Rating - 52 weeks - Last 10 games',
      latestXGamesToUse: 10,
      periodUnit: 'weeks',
      periodAmount: 52,
      primary: false,
      maxLevelUpPerChange: null,
      maxLevelDownPerChange: null,
    });

    const system7 = new RankingSystem({
      ...sourceSystem.toJSON(),
      id: '6b4f75c8-2e37-4adc-bdfc-8386687a32bf',
      rankingSystem: RankingSystems.BVL,
      name: 'BFF Rating - 78 weeks - Last 10 games',
      latestXGamesToUse: 10,
      periodUnit: 'weeks',
      primary: false,
      periodAmount: 78,
      maxLevelUpPerChange: null,
      maxLevelDownPerChange: null,
    });

    const system8 = new RankingSystem({
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

    const system9 = new RankingSystem({
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

    const system10 = new RankingSystem({
      ...sourceSystem.toJSON(),
      id: '658ff44c-e6d3-489b-a9c5-06952256c9f2',
      rankingSystem: RankingSystems.BVL,
      name: 'BFF Rating - 78 weeks - Last 20 games - 0 level diff',
      latestXGamesToUse: 20,
      periodUnit: 'weeks',
      differenceForUpgrade: 0,
      primary: false,
      periodAmount: 78,
      maxLevelUpPerChange: null,
      maxLevelDownPerChange: null,
    });

    const system11 = new RankingSystem({
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

    const system12 = new RankingSystem({
      ...sourceSystem.toJSON(),
      id: '9e00ec7b-0825-4b19-96cf-a4dc1fb5708b',
      rankingSystem: RankingSystems.BVL,
      name: 'BFF Rating - 78 weeks - Last 25 games - 0 level diff',
      latestXGamesToUse: 25,
      periodUnit: 'weeks',
      differenceForUpgrade: 0,
      primary: false,
      periodAmount: 78,
      maxLevelUpPerChange: null,
      maxLevelDownPerChange: null,
    });
    const system13 = new RankingSystem({
      ...sourceSystem.toJSON(),
      id: 'c327aff1-a0ba-498a-9e7b-202b1da04c65',
      rankingSystem: RankingSystems.BVL,
      name: 'BFF Rating - 78 weeks - Last 25 games - max 1 up',
      latestXGamesToUse: 25,
      periodUnit: 'weeks',
      primary: false,
      periodAmount: 78,
      maxLevelUpPerChange: 1,
      maxLevelDownPerChange: 1,
    });

    const system14 = new RankingSystem({
      ...sourceSystem.toJSON(),
      id: 'a9d35b02-91c6-4497-9bcc-b56b8baa4a39',
      rankingSystem: RankingSystems.BVL,
      name: 'BFF Rating - 78 weeks - Last 25 games - 0 level diff - max 1 up',
      latestXGamesToUse: 25,
      periodUnit: 'weeks',
      differenceForUpgrade: 0,
      primary: false,
      periodAmount: 78,
      maxLevelUpPerChange: 1,
      maxLevelDownPerChange: 1,
    });

    const system15 = new RankingSystem({
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

    // const targets = [system4, system5, system6, system7, system8, system9, system10, system11, system12, system13, system14, system15];
    const targets = [system15, system9, system11];

    for (const targetSystem of targets) {
      logger.info(`Calculating ${targetSystem.name}`);
      transaction = await DataBaseHandler.sequelizeInstance.transaction();

      // Destroy old
      await destroySystem(targetSystem);

      // Create new
      const resultSystem = await RankingSystem.create(
        {
          ...targetSystem.toJSON(),
        },
        { transaction }
      );

      // Set groups
      await resultSystem.setGroups(groups, { transaction });

      await copyPlaces(transaction, sourceSystem, resultSystem);
      await calulateLastPlace(transaction, resultSystem);
      await transaction.commit();
    }
  } catch (error) {
    logger.error('something went wrong', error);
    transaction.rollback();
  }
})();

async function destroySystem(system: RankingSystem) {
  await RankingSystem.destroy({
    where: {
      id: system.id,
    },
    cascade: true,
  });

  await RankingPlace.destroy({
    where: {
      SystemId: system.id,
    },
    cascade: true,
  });

  await RankingPoint.destroy({
    where: {
      SystemId: system.id,
    },
    cascade: true,
  });

  await LastRankingPlace.destroy({
    where: {
      systemId: system.id,
    },
    cascade: true,
  });
}

async function calulateLastPlace(
  transaction: Transaction,
  newSystem: RankingSystem
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
    transaction
  );
  await calculator['_calculateRankingPlacesAsync'](
    originalStart,
    originalEnd,
    players,
    true,
    transaction
  );
}

async function copyPlaces(
  transaction: Transaction,
  sourceSystem: RankingSystem,
  newSystem: RankingSystem
) {
  newSystem.caluclationIntervalLastUpdate =
    sourceSystem.caluclationIntervalLastUpdate;
  newSystem.updateIntervalAmountLastUpdate =
    sourceSystem.updateIntervalAmountLastUpdate;
  await newSystem.save({ transaction });

  const queryPlaces = `
  INSERT INTO "ranking"."Places" (id, "rankingDate", "singlePoints", "mixPoints", "doublePoints", "singleRank", "mixRank", "doubleRank", single, mix, double, "singlePointsDowngrade", "doublePointsDowngrade", "mixPointsDowngrade", "singleInactive", "doubleInactive", "mixInactive", "totalSingleRanking", "totalDoubleRanking", "totalMixRanking", "totalWithinSingleLevel", "totalWithinDoubleLevel", "totalWithinMixLevel", "playerId", "createdAt", "updatedAt", "updatePossible", gender, "SystemId")
  SELECT gen_random_uuid() as id, "rankingDate", "singlePoints", "mixPoints", "doublePoints", "singleRank", "mixRank", "doubleRank", single, mix, double, "singlePointsDowngrade", "doublePointsDowngrade", "mixPointsDowngrade", "singleInactive", "doubleInactive", "mixInactive", "totalSingleRanking", "totalDoubleRanking", "totalMixRanking", "totalWithinSingleLevel", "totalWithinDoubleLevel", "totalWithinMixLevel", "playerId", "createdAt", "updatedAt", "updatePossible", gender, '${newSystem.id}' as "SystemId"   
  FROM "ranking"."Places" 
  WHERE "SystemId" = '${sourceSystem.id}'
`;

  await DataBaseHandler.sequelizeInstance.query(queryPlaces, { transaction });
  logger.debug('Copied places');

  const queryLastPlaces = `
  INSERT INTO "ranking"."LastPlaces" (id, "rankingDate", "singlePoints", "mixPoints", "doublePoints", "singleRank", "mixRank", "doubleRank", single, mix, double, "singlePointsDowngrade", "doublePointsDowngrade", "mixPointsDowngrade", "singleInactive", "doubleInactive", "mixInactive", "totalSingleRanking", "totalDoubleRanking", "totalMixRanking", "totalWithinSingleLevel", "totalWithinDoubleLevel", "totalWithinMixLevel", "playerId", "createdAt", "updatedAt", gender, "systemId")
  SELECT gen_random_uuid() as id, "rankingDate", "singlePoints", "mixPoints", "doublePoints", "singleRank", "mixRank", "doubleRank", single, mix, double, "singlePointsDowngrade", "doublePointsDowngrade", "mixPointsDowngrade", "singleInactive", "doubleInactive", "mixInactive", "totalSingleRanking", "totalDoubleRanking", "totalMixRanking", "totalWithinSingleLevel", "totalWithinDoubleLevel", "totalWithinMixLevel", "playerId", "createdAt", "updatedAt", gender, '${newSystem.id}' as "systemId"   
  FROM "ranking"."LastPlaces" 
  WHERE "systemId" = '${sourceSystem.id}'
`;

  await DataBaseHandler.sequelizeInstance.query(queryLastPlaces, {
    transaction,
  });
  logger.debug('Copied LastPlaces');

  const queryPoints = `
  INSERT INTO "ranking"."Points" (id, points, "rankingDate", "differenceInLevel", "playerId", "GameId", "createdAt", "updatedAt", "SystemId" )
  SELECT gen_random_uuid() as id, points, "rankingDate", "differenceInLevel", "playerId", "GameId", "createdAt", "updatedAt", '${newSystem.id}' as "SystemId"
  FROM "ranking"."Points" 
  WHERE "SystemId" = '${sourceSystem.id}'
`;

  await DataBaseHandler.sequelizeInstance.query(queryPoints, { transaction });
  logger.debug('Copied Points');
}
