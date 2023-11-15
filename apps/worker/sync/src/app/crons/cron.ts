import { Sync, SyncQueue } from '@badman/backend-queue';
import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Queue } from 'bull';
import { CronJob } from 'cron';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);
  private offset = 0;

  constructor(
    @InjectQueue(SyncQueue) private readonly syncQ: Queue,
    private readonly schedulerRegistry: SchedulerRegistry,
    readonly configSerive: ConfigService,
  ) {
    // if not in production, offset the cron jobs by 15 minute
    this.offset = this.configSerive.get('NODE_ENV') === 'production' ? 0 : 15;
    this.logger.log(`Scheduling cron jobs`);

    this.QueueingSyncEvents();
    this.QueueingSyncRanking();
    this.QueueingCheckEncounters();

    this.getCrons();
  }

  public QueueingSyncEvents() {
    const cronTime = `${15 + this.offset} */4 * * *`;
    const job = CronJob.from({
      cronTime,
      onTick: () => {
        this.logger.verbose('Queueing SyncEvents');
        this.syncQ.add(Sync.SyncEvents, null, {
          removeOnFail: 1,
          removeOnComplete: true,
        });
      },
      timeZone: 'Europe/Brussels',
    });

    this.schedulerRegistry.addCronJob(Sync.SyncEvents, job);
    job.start();

    this.logger.verbose(`Cron SyncEvents scheduled at ${cronTime}`);
  }

  public QueueingSyncRanking() {
    const cronTime = `${0 + this.offset} 18 * * *`;
    const job = CronJob.from({
      cronTime,
      onTick: () => {
        this.logger.verbose('Queueing SyncRanking');

        this.syncQ.add(Sync.SyncRanking, null, {
          removeOnFail: 1,
          removeOnComplete: true,
        });
      },
      timeZone: 'Europe/Brussels',
    });

    this.schedulerRegistry.addCronJob(Sync.SyncRanking, job);
    job.start();

    this.logger.verbose(`Cron SyncRanking scheduled at ${cronTime}`);
  }

  public QueueingCheckEncounters() {
    const cronTime = `${30 + this.offset} */4 * * *`;
    const job = CronJob.from({
      cronTime,
      onTick: () => {
        this.logger.verbose('Queueing CheckEncounters');

        this.syncQ.add(Sync.CheckEncounters, null, {
          removeOnFail: 1,
          removeOnComplete: true,
        });
      },
      timeZone: 'Europe/Brussels',
    });

    this.schedulerRegistry.addCronJob(Sync.CheckEncounters, job);
    job.start();

    this.logger.verbose(`Cron CheckEncounters scheduled at ${cronTime}`);
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
