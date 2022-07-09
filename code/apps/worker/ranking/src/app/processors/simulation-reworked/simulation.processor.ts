import { Ranking, Simulation, SimulationQueue } from '@badman/queue';
import {
  InjectQueue,
  OnQueueCompleted,
  Process,
  Processor,
} from '@nestjs/bull';
import { Inject, Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { Sequelize } from 'sequelize-typescript';

@Processor({
  name: SimulationQueue,
})
export class SimulationV2Processor {
  private readonly logger = new Logger(SimulationV2Processor.name);

  constructor(
    @Inject('SEQUELIZE') private _sequelize: Sequelize,
    @InjectQueue(SimulationQueue) private rankingS: Queue
  ) {
    this.logger.debug('SyncRanking');
  }

  @Process(Simulation.StartV2)
  async startSimulation(
    job: Job<{ systemIds: string[]; stop?: Date | string }>
  ): Promise<void> {
    this.logger.log('Start Simulation v2', job.data);

    // const systems = await RankingSystem.findAll({
    //   where: {
    //     id: job.data.systemIds,
    //     runCurrently: false,
    //   },
    //   include: [{ model: RankingGroup }],
    // });

    // if (systems.length === 0) {
    //   this.logger.log('No systems to run');
    //   return;
    // }

    // for (const system of systems) {

    // }

    const test = await this.rankingS.add(Ranking.steps.step1, {
      removeOnComplete: true,
    });

    let completed = await test.isCompleted();
    while (completed === false) {
      this.logger.verbose(`Waiting .. ${test.progress()}`);
      completed = await test.isCompleted();
    }

    this.logger.debug(test.returnvalue);

    this.logger.log('Finish Simulation');
    return;
  }

  @Process(Ranking.steps.step1)
  async step1(job: Job<string>): Promise<string> {
    this.logger.log('Step 1', job.data);
    return 'uw ma';
  }

  @OnQueueCompleted({
    name: Ranking.steps.step1,
  })
  onCompletedStep1(job: Job) {
    this.logger.log(
      `Completed job ${job.id} of type ${job.name} with result ${job.returnvalue}`
    );
  }
}
