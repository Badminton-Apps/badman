import { Sync, SyncQueue, TransactionManager } from '@badman/backend-queue';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';

@Processor({
  name: SyncQueue,
})
export class EncounterCompetitionScheduler {
  private readonly logger = new Logger(EncounterCompetitionScheduler.name);

  constructor(
    private readonly _transactionManager: TransactionManager,
    @InjectQueue(SyncQueue) private readonly _syncQueue: Queue,
  ) {}

  @Process(Sync.ScheduleSyncCompetitionEncounter)
  async ScheduleSyncCompetitionEncounter(
    job: Job<{
      transactionId: string;
      subEventId: string;
      eventCode: string;
      drawId: string;
      encounterId: string;
      encounterCode: number;
    }>,
  ): Promise<void> {
    const transactionId = await this._transactionManager.transaction();

    const executor = await this._syncQueue.add(Sync.ProcessSyncCompetitionEncounter, {
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

      this.logger.debug(`Synced competition game`);
    } catch (error) {
      await this._transactionManager.rollbackTransaction(transactionId);
      this.logger.error(`Failed to sync competition game`, error);
    }
  }
}
