import { RankingGroup, RankingSystem } from '@badman/backend-database';
import { Simulation, SimulationQueue } from '@badman/backend-queue';
import { getSystemCalc } from '@badman/backend-ranking-calc';
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { DoneCallback, Job } from 'bull';
import moment from 'moment';

@Processor({
  name: SimulationQueue,
})
export class SimulationProcessor {
  private readonly logger = new Logger(SimulationProcessor.name);

  constructor() {
    this.logger.debug('SyncSimulation');
  }

  @Process({
    name: Simulation.Start,
    concurrency: 0,
  })
  async startSimulation(
    job: Job<{
      systemIds: string[];
      stop?: Date | string;
      start?: Date | string;
    }>,
    callback?: DoneCallback
  ) {
    try {
      this.logger.log(`Start Simulation`);
      this.logger.debug(job.data);
      const systems = await RankingSystem.findAll({
        where: {
          id: job.data.systemIds,
          runCurrently: false,
        },
        include: [{ model: RankingGroup }],
      });

      if (systems.length === 0) {
        this.logger.log('No systems to run');
        return;
      }

      for (const system of systems) {
        const stop = job.data.stop
          ? moment(job.data.stop)
          : moment(system.caluclationIntervalLastUpdate).add(
              system.caluclationIntervalAmount,
              system.calculationIntervalUnit
            );
        const calc = getSystemCalc(system);

        this.logger.log(`Start Simulation of ${system.name}`);
        try {
          await calc.beforeCalculationAsync();
          await calc.calculateAsync(stop);
        } finally {
          await calc.afterCalculationAsync();
        }
      }
      return callback(null, 'finish');
    } catch (e) {
      this.logger.error(e);
      return callback(e);
    } finally {
      this.logger.log('Finish Simulation');
    }
  }
}

/*
delete from   "ranking"."RankingPlaces" where "systemId" = '8f660b40-bc31-47d1-af36-f713c37467fd';
delete from   "ranking"."RankingLastPlaces" where "systemId" = '8f660b40-bc31-47d1-af36-f713c37467fd';
delete from   "ranking"."RankingPoints" where "systemId" = '8f660b40-bc31-47d1-af36-f713c37467fd';

INSERT INTO "ranking"."RankingPlaces" (id, "rankingDate", "singlePoints", "mixPoints", "doublePoints", "singleRank", "mixRank", "doubleRank", single, mix, double, "singlePointsDowngrade", "doublePointsDowngrade", "mixPointsDowngrade", "singleInactive", "doubleInactive", "mixInactive", "totalSingleRanking", "totalDoubleRanking", "totalMixRanking", "totalWithinSingleLevel", "totalWithinDoubleLevel", "totalWithinMixLevel", "playerId", "createdAt", "updatedAt", "updatePossible", gender, "systemId")
  SELECT gen_random_uuid() as id, "rankingDate", "singlePoints", "mixPoints", "doublePoints", "singleRank", "mixRank", "doubleRank", single, mix, double, "singlePointsDowngrade", "doublePointsDowngrade", "mixPointsDowngrade", "singleInactive", "doubleInactive", "mixInactive", "totalSingleRanking", "totalDoubleRanking", "totalMixRanking", "totalWithinSingleLevel", "totalWithinDoubleLevel", "totalWithinMixLevel", "playerId", "createdAt", "updatedAt", "updatePossible", gender, '8f660b40-bc31-47d1-af36-f713c37467fd' as "systemId"   
  FROM "ranking"."RankingPlaces" 
  WHERE "systemId" = '934116c8-ee7e-4f3c-9c8b-6de579c3686f';

INSERT INTO "ranking"."RankingLastPlaces" (id, "rankingDate", "singlePoints", "mixPoints", "doublePoints", "singleRank", "mixRank", "doubleRank", single, mix, double, "singlePointsDowngrade", "doublePointsDowngrade", "mixPointsDowngrade", "singleInactive", "doubleInactive", "mixInactive", "totalSingleRanking", "totalDoubleRanking", "totalMixRanking", "totalWithinSingleLevel", "totalWithinDoubleLevel", "totalWithinMixLevel", "playerId", "createdAt", "updatedAt", gender, "systemId")
  SELECT gen_random_uuid() as id, "rankingDate", "singlePoints", "mixPoints", "doublePoints", "singleRank", "mixRank", "doubleRank", single, mix, double, "singlePointsDowngrade", "doublePointsDowngrade", "mixPointsDowngrade", "singleInactive", "doubleInactive", "mixInactive", "totalSingleRanking", "totalDoubleRanking", "totalMixRanking", "totalWithinSingleLevel", "totalWithinDoubleLevel", "totalWithinMixLevel", "playerId", "createdAt", "updatedAt", gender, '8f660b40-bc31-47d1-af36-f713c37467fd' as "systemId"
  FROM "ranking"."RankingLastPlaces" 
  WHERE "systemId" = '934116c8-ee7e-4f3c-9c8b-6de579c3686f';

INSERT INTO "ranking"."RankingPoints" (id, points, "rankingDate", "differenceInLevel", "playerId", "gameId", "createdAt", "updatedAt", "systemId" )
  SELECT gen_random_uuid() as id, points, "rankingDate", "differenceInLevel", "playerId", "gameId", "createdAt", "updatedAt", '8f660b40-bc31-47d1-af36-f713c37467fd' as "systemId"
  FROM "ranking"."RankingPoints" 
  WHERE "systemId" = '934116c8-ee7e-4f3c-9c8b-6de579c3686f';  
*/

/*
delete from   "ranking"."RankingPlaces" where "systemId" = 'c6d33db8-a688-42f6-ae9e-f4516d30fd3f';
delete from   "ranking"."RankingLastPlaces" where "systemId" = 'c6d33db8-a688-42f6-ae9e-f4516d30fd3f';
delete from   "ranking"."RankingPoints" where "systemId" = 'c6d33db8-a688-42f6-ae9e-f4516d30fd3f';

INSERT INTO "ranking"."RankingPlaces" (id, "rankingDate", "singlePoints", "mixPoints", "doublePoints", "singleRank", "mixRank", "doubleRank", single, mix, double, "singlePointsDowngrade", "doublePointsDowngrade", "mixPointsDowngrade", "singleInactive", "doubleInactive", "mixInactive", "totalSingleRanking", "totalDoubleRanking", "totalMixRanking", "totalWithinSingleLevel", "totalWithinDoubleLevel", "totalWithinMixLevel", "playerId", "createdAt", "updatedAt", "updatePossible", gender, "systemId")
  SELECT gen_random_uuid() as id, "rankingDate", "singlePoints", "mixPoints", "doublePoints", "singleRank", "mixRank", "doubleRank", single, mix, double, "singlePointsDowngrade", "doublePointsDowngrade", "mixPointsDowngrade", "singleInactive", "doubleInactive", "mixInactive", "totalSingleRanking", "totalDoubleRanking", "totalMixRanking", "totalWithinSingleLevel", "totalWithinDoubleLevel", "totalWithinMixLevel", "playerId", "createdAt", "updatedAt", "updatePossible", gender, 'c6d33db8-a688-42f6-ae9e-f4516d30fd3f' as "systemId"   
  FROM "ranking"."RankingPlaces" 
  WHERE "systemId" = '934116c8-ee7e-4f3c-9c8b-6de579c3686f';

INSERT INTO "ranking"."RankingLastPlaces" (id, "rankingDate", "singlePoints", "mixPoints", "doublePoints", "singleRank", "mixRank", "doubleRank", single, mix, double, "singlePointsDowngrade", "doublePointsDowngrade", "mixPointsDowngrade", "singleInactive", "doubleInactive", "mixInactive", "totalSingleRanking", "totalDoubleRanking", "totalMixRanking", "totalWithinSingleLevel", "totalWithinDoubleLevel", "totalWithinMixLevel", "playerId", "createdAt", "updatedAt", gender, "systemId")
  SELECT gen_random_uuid() as id, "rankingDate", "singlePoints", "mixPoints", "doublePoints", "singleRank", "mixRank", "doubleRank", single, mix, double, "singlePointsDowngrade", "doublePointsDowngrade", "mixPointsDowngrade", "singleInactive", "doubleInactive", "mixInactive", "totalSingleRanking", "totalDoubleRanking", "totalMixRanking", "totalWithinSingleLevel", "totalWithinDoubleLevel", "totalWithinMixLevel", "playerId", "createdAt", "updatedAt", gender, 'c6d33db8-a688-42f6-ae9e-f4516d30fd3f' as "systemId"
  FROM "ranking"."RankingLastPlaces" 
  WHERE "systemId" = '934116c8-ee7e-4f3c-9c8b-6de579c3686f';

INSERT INTO "ranking"."RankingPoints" (id, points, "rankingDate", "differenceInLevel", "playerId", "gameId", "createdAt", "updatedAt", "systemId" )
  SELECT gen_random_uuid() as id, points, "rankingDate", "differenceInLevel", "playerId", "gameId", "createdAt", "updatedAt", 'c6d33db8-a688-42f6-ae9e-f4516d30fd3f' as "systemId"
  FROM "ranking"."RankingPoints" 
  WHERE "systemId" = '934116c8-ee7e-4f3c-9c8b-6de579c3686f';  
*/

/*
delete from   "ranking"."RankingPlaces" where "systemId" = 'e6e4c0a8-8403-4ad6-9d0c-f56bd7bdf553';
delete from   "ranking"."RankingLastPlaces" where "systemId" = 'e6e4c0a8-8403-4ad6-9d0c-f56bd7bdf553';
delete from   "ranking"."RankingPoints" where "systemId" = 'e6e4c0a8-8403-4ad6-9d0c-f56bd7bdf553';

INSERT INTO "ranking"."RankingPlaces" (id, "rankingDate", "singlePoints", "mixPoints", "doublePoints", "singleRank", "mixRank", "doubleRank", single, mix, double, "singlePointsDowngrade", "doublePointsDowngrade", "mixPointsDowngrade", "singleInactive", "doubleInactive", "mixInactive", "totalSingleRanking", "totalDoubleRanking", "totalMixRanking", "totalWithinSingleLevel", "totalWithinDoubleLevel", "totalWithinMixLevel", "playerId", "createdAt", "updatedAt", "updatePossible", gender, "systemId")
  SELECT gen_random_uuid() as id, "rankingDate", "singlePoints", "mixPoints", "doublePoints", "singleRank", "mixRank", "doubleRank", single, mix, double, "singlePointsDowngrade", "doublePointsDowngrade", "mixPointsDowngrade", "singleInactive", "doubleInactive", "mixInactive", "totalSingleRanking", "totalDoubleRanking", "totalMixRanking", "totalWithinSingleLevel", "totalWithinDoubleLevel", "totalWithinMixLevel", "playerId", "createdAt", "updatedAt", "updatePossible", gender, 'e6e4c0a8-8403-4ad6-9d0c-f56bd7bdf553' as "systemId"   
  FROM "ranking"."RankingPlaces" 
  WHERE "systemId" = '934116c8-ee7e-4f3c-9c8b-6de579c3686f';

INSERT INTO "ranking"."RankingLastPlaces" (id, "rankingDate", "singlePoints", "mixPoints", "doublePoints", "singleRank", "mixRank", "doubleRank", single, mix, double, "singlePointsDowngrade", "doublePointsDowngrade", "mixPointsDowngrade", "singleInactive", "doubleInactive", "mixInactive", "totalSingleRanking", "totalDoubleRanking", "totalMixRanking", "totalWithinSingleLevel", "totalWithinDoubleLevel", "totalWithinMixLevel", "playerId", "createdAt", "updatedAt", gender, "systemId")
  SELECT gen_random_uuid() as id, "rankingDate", "singlePoints", "mixPoints", "doublePoints", "singleRank", "mixRank", "doubleRank", single, mix, double, "singlePointsDowngrade", "doublePointsDowngrade", "mixPointsDowngrade", "singleInactive", "doubleInactive", "mixInactive", "totalSingleRanking", "totalDoubleRanking", "totalMixRanking", "totalWithinSingleLevel", "totalWithinDoubleLevel", "totalWithinMixLevel", "playerId", "createdAt", "updatedAt", gender, 'e6e4c0a8-8403-4ad6-9d0c-f56bd7bdf553' as "systemId"
  FROM "ranking"."RankingLastPlaces" 
  WHERE "systemId" = '934116c8-ee7e-4f3c-9c8b-6de579c3686f';

INSERT INTO "ranking"."RankingPoints" (id, points, "rankingDate", "differenceInLevel", "playerId", "gameId", "createdAt", "updatedAt", "systemId" )
  SELECT gen_random_uuid() as id, points, "rankingDate", "differenceInLevel", "playerId", "gameId", "createdAt", "updatedAt", 'e6e4c0a8-8403-4ad6-9d0c-f56bd7bdf553' as "systemId"
  FROM "ranking"."RankingPoints" 
  WHERE "systemId" = '934116c8-ee7e-4f3c-9c8b-6de579c3686f';  
*/
