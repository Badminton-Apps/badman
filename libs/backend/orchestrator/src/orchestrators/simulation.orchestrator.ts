import { SimulationQueue } from '@badman/backend-queue';
import { InjectQueue, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Queue } from 'bull';
import { OrchestratorBase } from './base.orchestrator';
import { RenderService } from '../services/render.service';

@Processor({
  name: SimulationQueue,
})
export class OrchestratorSimulation extends OrchestratorBase {
  override logger = new Logger(OrchestratorSimulation.name);

  constructor(
    private readonly renderService: RenderService,
    @InjectQueue(SimulationQueue) private _simulationQueue: Queue,
  ) {
    super();
    this.logger.log(`${SimulationQueue} Orchestrator created`);

    // if any jobs are left in the queue, start the server
    this._simulationQueue.getJobCounts().then((counts) => {
      this.logger.log(
        `[SIM] Found ${counts.waiting} jobs in queue, starting worker`,
      );
      if (counts.waiting > 0) {
        super.queueWaiting();
      } else {
        this.stopServer();
      }
    });
  }

  override startServer(): void {
    this.logger.log(`[SIM] Starting worker for queue ${SimulationQueue}`);
    this.renderService.startService('simulation');
  }

  override stopServer(): void {
    this.logger.log(`[SIM] Stopping worker for queue ${SimulationQueue}`);
    this.renderService.suspendService('simulation');
  }
}
