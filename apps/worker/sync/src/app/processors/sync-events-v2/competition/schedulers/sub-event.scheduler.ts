import { Sync, SyncQueue, TransactionManager } from '@badman/backend-queue';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';

@Processor({
  name: SyncQueue,
})
export class SubEventCompetitionScheduler {
  private readonly logger = new Logger(SubEventCompetitionScheduler.name);

  constructor(
    private readonly _transactionManager: TransactionManager,
    @InjectQueue(SyncQueue) private readonly _syncQueue: Queue,
  ) {}

  @Process(Sync.ScheduleSyncCompetitionSubEvent)
  async ScheduleSyncCompetitionSubEvent(
    job: Job<{
      subEventId: string;
      eventCode: string;
      subEventCode: string;
    }>,
  ): Promise<void> {
    const transactionId = await this._transactionManager.transaction();

    const executor = await this._syncQueue.add(Sync.ProcessSyncCompetitionSubEvent, {
      transactionId,
      ...job.data,
    });

    try {
      this._transactionManager.addJob(transactionId, executor);
      await executor.finished();

      // check evey 3 seconds if the job is finished
      while (!(await this._transactionManager.transactionFinished(transactionId))) {
        this.logger.debug(`Waiting for jobs to finish`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      if (await this._transactionManager.transactionErrored(transactionId)) {
        throw new Error('Error in transaction');
      }

      await this._transactionManager.commitTransaction(transactionId);

      this.logger.debug(`Synced competition subevent`);
    } catch (error) {
      await this._transactionManager.rollbackTransaction(transactionId);
      this.logger.error(`Failed to sync competition subevent`, error);
    }
  }
}
