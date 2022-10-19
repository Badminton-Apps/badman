import {
  Simulation,
  SimulationQueue,
  SimulationV2Job,
} from '@badman/backend-queue';
import { CalculationService } from '@badman/backend-ranking';
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

@Processor({
  name: SimulationQueue,
})
export class SimulationV2Processor {
  private readonly logger = new Logger(SimulationV2Processor.name);

  constructor(private calculationService: CalculationService) {
    this.logger.debug('SyncRanking');
  }

  @Process(Simulation.StartV2)
  async startSimulation(job: Job<SimulationV2Job>): Promise<void> {
    this.logger.log('Start Simulation v2');
    this.logger.debug(job.data);

    await this.calculationService.simulation(
      job.data.systemId,
      job.data.calcDate,
      job.data.periods,
      true,
      false
    );
  }
}
