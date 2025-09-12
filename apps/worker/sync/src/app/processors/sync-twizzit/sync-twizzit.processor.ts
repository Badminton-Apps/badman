import { CronJob } from "@badman/backend-database";
import { Sync, SyncQueue } from "@badman/backend-queue";
import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job } from "bull";
import { Sequelize } from "sequelize-typescript";
import { TwizzitSyncer } from "./sync-twizzit";
import { TwizzitService } from "@badman/backend-twizzit";

@Processor({
  name: SyncQueue,
})
export class SyncTwizzitProcessor {
  private readonly logger = new Logger(SyncTwizzitProcessor.name);
  private _twizzitSyncer: TwizzitSyncer;

  constructor(
    private _sequelize: Sequelize,
    private _twizzitService: TwizzitService
  ) {}

  @Process({
    name: Sync.SyncTwizzit,
    concurrency: 1, // Ensure sequential processing
  })
  async syncTwizzit(
    job: Job<{
      start: string;
    }>
  ): Promise<void> {
    this.logger.debug(`Syncing Ranking, data: ${JSON.stringify(job.data)}`);

    const transaction = await this._sequelize.transaction();

    const cronJob = await CronJob.findOne({
      where: {
        "meta.jobName": Sync.SyncTwizzit,
        "meta.queueName": SyncQueue,
      },
    });

    if (!cronJob) {
      throw new Error("Job not found");
    }

    if (cronJob.running) {
      this.logger.log("Job already running");
      return;
    }

    cronJob.amount++;
    await cronJob.save();

    try {
      // create syncer
      this._twizzitSyncer = new TwizzitSyncer(this._twizzitService, this._sequelize);

      // process
      await this._twizzitSyncer.process({
        transaction,
        ...job.data,
      });

      this.logger.debug("Commiting");

      await transaction.commit();
      this.logger.debug("Syncing Ranking done");
    } catch (error) {
      this.logger.error("Rolling back");
      await transaction.rollback();
      throw error;
    } finally {
      cronJob.amount--;
      cronJob.lastRun = new Date();
      await cronJob.save();
    }
  }
}
