import { DrawCompetition, SubEventCompetition } from "@badman/backend-database";
import { Sync, SyncQueue, TransactionManager } from "@badman/backend-queue";
import { InjectQueue, Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job, Queue } from "bull";

@Processor({
  name: SyncQueue,
})
export class ScheduleRecalculateStandingCompetitionSubEvent {
  private readonly logger = new Logger(ScheduleRecalculateStandingCompetitionSubEvent.name);

  constructor(
    private readonly _transactionManager: TransactionManager,
    @InjectQueue(SyncQueue) private readonly _syncQueue: Queue
  ) {}

  @Process(Sync.ScheduleRecalculateStandingCompetitionSubEvent)
  async ScheduleRecalculateStandingCompetitionSubEvent(
    job: Job<{
      eventId: string;
    }>
  ): Promise<void> {
    const transactionId = await this._transactionManager.transaction();

    // get all draws for the event
    const subEvent = await SubEventCompetition.findByPk(job.data.eventId, {
      attributes: ["id"],

      include: [
        {
          attributes: ["id"],
          model: DrawCompetition,
        },
      ],
    });

    const drawwIds = subEvent.drawCompetitions?.map((draw) => draw.id);

    for (const drawId of drawwIds) {
      const executor = await this._syncQueue.add(Sync.ProcessSyncCompetitionDrawStanding, {
        transactionId,
        drawId,
      });
      this._transactionManager.addJob(transactionId, executor);
    }

    try {
      // check evey 3 seconds if the job is finished
      while (!(await this._transactionManager.transactionFinished(transactionId))) {
        this.logger.debug(`Waiting for jobs to finish`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      if (await this._transactionManager.transactionErrored(transactionId)) {
        throw new Error("Error in transaction");
      }

      await this._transactionManager.commitTransaction(transactionId);

      this.logger.debug(`Synced tournament event`);
    } catch (error) {
      await this._transactionManager.rollbackTransaction(transactionId);
      this.logger.error(`Failed to sync tournament event`, error);
    }
  }
}
