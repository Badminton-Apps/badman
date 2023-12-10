import { CronJob } from '@badman/backend-database';
import { SimulationQueue, Sync, SyncQueue } from '@badman/backend-queue';
import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Queue } from 'bull';
import { CronJob as Job } from 'cron';

@Injectable()
export class CronService implements OnModuleInit {
  private readonly logger = new Logger(CronService.name);

  constructor(
    @InjectQueue(SyncQueue) private readonly syncQ: Queue,
    @InjectQueue(SimulationQueue) private readonly simQ: Queue,
    private readonly schedulerRegistry: SchedulerRegistry,
    readonly configSerive: ConfigService,
  ) {
    // const cronSyncEvents =
    //   this.configSerive.get<string>('CRON_SYNC_EVENTS') ?? '5 0/4 * * *';
    // const cronSyncRanking =
    //   this.configSerive.get<string>('CRON_SYNC_RANKING') ?? '0 0/4 * * MON-TUE';
    // const cronCheckEncounters =
    //   this.configSerive.get<string>('CRON_CHECK_ENCOUNTERS') ?? '15 0/4 * * *';
    // this.logger.log(`Scheduling cron jobs`);
    // this.QueueingSyncEvents(cronSyncEvents); 
    // this.QueueingSyncRanking(cronSyncRanking);
    // this.QueueingCheckEncounters(cronCheckEncounters);
    // this.getCrons();
  }

  async onModuleInit() {
    const jobs = await CronJob.findAll();

    for (const job of jobs) {
      this.QueueJob(job);
    }

    this.getCrons();
  }

  private _getQueue(queueName: string) {
    switch (queueName) {
      case SyncQueue:
        return this.syncQ;
      case SimulationQueue:
        return this.simQ;
      default:
        throw new Error(`Queue ${queueName} not found`);
    }
  }

  private QueueJob(job: CronJob) {
    if (!job.meta?.queueName) {
      throw new Error(`Queue name not found for job ${job.name}`);
    }

    const j = Job.from({
      cronTime: job.cronTime,
      onTick: async () => {
        job.lastRun = new Date();
        await job.save();
        this.logger.verbose(`Queueing ${job.name}`);
        const queue = this._getQueue(job.meta!.queueName);
        queue.add(job.meta!.jobName, job.meta?.arguments, {
          removeOnFail: 1,
          removeOnComplete: true,
        });
      },
      timeZone: 'Europe/Brussels',
    });

    this.schedulerRegistry.addCronJob(job.name, j);
    j.start();

    this.logger.verbose(`Cron ${job.name} scheduled at ${job.cronTime}`);
  }

  getCrons() {
    const jobs = this.schedulerRegistry.getCronJobs();
    jobs.forEach((value, key) => {
      let next;
      try {
        next = value.nextDates(1);
      } catch (e) {
        next = 'error: next fire date is in the past!';
      }
      this.logger.debug(`job: ${key} -> next: ${next}`);
    });
  }
}
