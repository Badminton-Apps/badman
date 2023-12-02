import { SyncQueue } from '@badman/backend-queue';
import { InjectQueue, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { OrchestratorBase } from './base.orchestrator';
import { RenderService } from '../services/render.service';
import { Queue } from 'bull';

@Processor({
  name: SyncQueue,
})
export class OrchestratorSync extends OrchestratorBase {
  override logger = new Logger(OrchestratorBase.name);

  constructor(
    private readonly renderService: RenderService,
    @InjectQueue(SyncQueue) private _queue: Queue,
  ) {
    super();
    this.logger.log(`${SyncQueue} Orchestrator created`);

    // if any jobs are left in the queue, start the server
    this._queue.getJobCounts().then((counts) => {
      if (counts.waiting > 0) {
        this.logger.log(
          `[${SyncQueue}] Found ${counts.waiting} jobs in queue, starting worker`,
        );
        super.queueWaiting();
      } else {
        this.logger.log(`[${SyncQueue}] No jobs in queue, stopping worker`);
        this.stopServer();
      }
    });
  }

  override startServer(): void {
    this.logger.log(`[${SyncQueue}] Starting worker for queue ${SyncQueue}`);
    this.renderService.startService('sync');
  }

  override stopServer(): void {
    this.logger.log(`[${SyncQueue}] Stopping worker for queue ${SyncQueue}`);
    this.renderService.suspendService('sync');
  } 
}
