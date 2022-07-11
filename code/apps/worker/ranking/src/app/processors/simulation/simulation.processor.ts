import { RankingGroup, RankingSystem } from '@badman/api/database';
import { Simulation, SimulationQueue } from '@badman/queue';
import { getSystemCalc } from '@badman/ranking-calc';
import { Process, Processor } from '@nestjs/bull';
import { Inject, Logger } from '@nestjs/common';
import { DoneCallback, Job } from 'bull';
import moment from 'moment';
import { Sequelize } from 'sequelize-typescript';

@Processor({
  name: SimulationQueue,
})
export class SimulationProcessor {
  private readonly logger = new Logger(SimulationProcessor.name);

  constructor(@Inject('SEQUELIZE') private _sequelize: Sequelize) {
    this.logger.debug('SyncSimulation');
  }

  @Process({
    name: Simulation.Start,
    concurrency: 0,
  })
  async startSimulation(
    job: Job<{ systemIds: string[]; stop?: Date | string }>,
    callback?: DoneCallback
  ) {
    try {
      this.logger.log('Start Simulation', job.data);
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
delete from   "ranking"."RankingPlaces" where "systemId" = 'ee720b52-cdd6-4bbe-bf19-976a3750cda3';
delete from   "ranking"."RankingLastPlaces" where "systemId" = 'ee720b52-cdd6-4bbe-bf19-976a3750cda3';
delete from   "ranking"."RankingPoints" where "systemId" = 'ee720b52-cdd6-4bbe-bf19-976a3750cda3';

INSERT INTO "ranking"."RankingPlaces" (id, "rankingDate", "singlePoints", "mixPoints", "doublePoints", "singleRank", "mixRank", "doubleRank", single, mix, double, "singlePointsDowngrade", "doublePointsDowngrade", "mixPointsDowngrade", "singleInactive", "doubleInactive", "mixInactive", "totalSingleRanking", "totalDoubleRanking", "totalMixRanking", "totalWithinSingleLevel", "totalWithinDoubleLevel", "totalWithinMixLevel", "playerId", "createdAt", "updatedAt", "updatePossible", gender, "systemId")
  SELECT gen_random_uuid() as id, "rankingDate", "singlePoints", "mixPoints", "doublePoints", "singleRank", "mixRank", "doubleRank", single, mix, double, "singlePointsDowngrade", "doublePointsDowngrade", "mixPointsDowngrade", "singleInactive", "doubleInactive", "mixInactive", "totalSingleRanking", "totalDoubleRanking", "totalMixRanking", "totalWithinSingleLevel", "totalWithinDoubleLevel", "totalWithinMixLevel", "playerId", "createdAt", "updatedAt", "updatePossible", gender, 'ee720b52-cdd6-4bbe-bf19-976a3750cda3' as "systemId"   
  FROM "ranking"."RankingPlaces" 
  WHERE "systemId" = '934116c8-ee7e-4f3c-9c8b-6de579c3686f';

INSERT INTO "ranking"."RankingLastPlaces" (id, "rankingDate", "singlePoints", "mixPoints", "doublePoints", "singleRank", "mixRank", "doubleRank", single, mix, double, "singlePointsDowngrade", "doublePointsDowngrade", "mixPointsDowngrade", "singleInactive", "doubleInactive", "mixInactive", "totalSingleRanking", "totalDoubleRanking", "totalMixRanking", "totalWithinSingleLevel", "totalWithinDoubleLevel", "totalWithinMixLevel", "playerId", "createdAt", "updatedAt", gender, "systemId")
  SELECT gen_random_uuid() as id, "rankingDate", "singlePoints", "mixPoints", "doublePoints", "singleRank", "mixRank", "doubleRank", single, mix, double, "singlePointsDowngrade", "doublePointsDowngrade", "mixPointsDowngrade", "singleInactive", "doubleInactive", "mixInactive", "totalSingleRanking", "totalDoubleRanking", "totalMixRanking", "totalWithinSingleLevel", "totalWithinDoubleLevel", "totalWithinMixLevel", "playerId", "createdAt", "updatedAt", gender, 'ee720b52-cdd6-4bbe-bf19-976a3750cda3' as "systemId"
  FROM "ranking"."RankingLastPlaces" 
  WHERE "systemId" = '934116c8-ee7e-4f3c-9c8b-6de579c3686f';

INSERT INTO "ranking"."RankingPoints" (id, points, "rankingDate", "differenceInLevel", "playerId", "gameId", "createdAt", "updatedAt", "systemId" )
  SELECT gen_random_uuid() as id, points, "rankingDate", "differenceInLevel", "playerId", "gameId", "createdAt", "updatedAt", 'ee720b52-cdd6-4bbe-bf19-976a3750cda3' as "systemId"
  FROM "ranking"."RankingPoints" 
  WHERE "systemId" = '934116c8-ee7e-4f3c-9c8b-6de579c3686f';
*/
