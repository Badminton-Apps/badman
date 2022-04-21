import { DataBaseHandler, logger, RankingSystem } from '@badvlasim/shared/';
import { Transaction } from 'sequelize';

export async function copyPlaces(
  sourceSystem: RankingSystem,
  newSystem: RankingSystem,
  transaction: Transaction,
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
