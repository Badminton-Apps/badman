import {
  Simulation,
  SimulationQueue,
  SimulationV2Job
} from '@badman/backend-queue';
import { CalculationService } from '@badman/backend-ranking';
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

@Processor({
  name: SimulationQueue,
})
export class SimulationProcessor {
  private readonly _logger = new Logger(SimulationProcessor.name);

  constructor(
    private calculationService: CalculationService,
  ) {
    this._logger.debug('SyncRanking');
  }

  @Process(Simulation.Start)
  async startSimulation(job: Job<SimulationV2Job>): Promise<void> {
    this._logger.log('Start Simulation v2');
    this._logger.debug(job.data);
    // const transaction = await this.sequelize.transaction();

    await this.calculationService.simulation(
      job.data.systemId,
      job.data.calcDate,
      job.data.periods,
      job.data.recalculatePoints,
    );
  }
}
