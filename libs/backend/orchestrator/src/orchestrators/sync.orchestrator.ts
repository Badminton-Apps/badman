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
    @InjectQueue(SyncQueue) private _syncQueue: Queue,
  ) {
    super();
    this.logger.log(`${SyncQueue} Orchestrator created`);

    // if any jobs are left in the queue, start the server
    this._syncQueue.getJobCounts().then((counts) => {
      if (counts.waiting > 0) {
        this.logger.log(`[SYNC] Found ${counts.waiting} jobs in queue, starting worker`);
        super.queueWaiting();
      } else{
        this.logger.log(`[SYNC] No jobs in queue, stopping worker`);
        super.finished();
      }
    });
  }

  override startServer(): void {
    this.logger.log(`[SYNC] Starting worker for queue ${SyncQueue}`);
    this.renderService.startService('sync');
  }

  override stopServer(): void {
    this.logger.log(`[SYNC] Stopping worker for queue ${SyncQueue}`);
    this.renderService.suspendService('sync');
  }
}
