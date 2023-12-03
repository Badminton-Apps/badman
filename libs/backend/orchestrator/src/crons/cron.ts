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
  private cronSyncEvents: string;
  private cronSyncRanking: string;
  private cronCheckEncounters: string;

  constructor(
    @InjectQueue(SyncQueue) private readonly syncQ: Queue,
    private readonly schedulerRegistry: SchedulerRegistry,
    readonly configSerive: ConfigService,
  ) {
    this.cronSyncEvents =
      this.configSerive.get<string>('CRON_SYNC_EVENTS') ?? '5 0/4 * * *';

    this.cronSyncRanking =
      this.configSerive.get<string>('CRON_SYNC_RANKING') ?? '0 */4 * * MON-TUE';

    this.cronCheckEncounters =
      this.configSerive.get<string>('CRON_CHECK_ENCOUNTERS') ?? '15 0/4 * * *';

    this.logger.log(`Scheduling cron jobs`);

    this.QueueingSyncEvents();
    this.QueueingSyncRanking();
    this.QueueingCheckEncounters();

    this.getCrons();
  }

  public QueueingSyncEvents() {
    const job = CronJob.from({
      cronTime: this.cronSyncEvents,
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

    this.logger.verbose(`Cron SyncEvents scheduled at ${this.cronSyncEvents}`);
  }

  public QueueingSyncRanking() {
    const job = CronJob.from({
      cronTime: this.cronSyncRanking,
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

    this.logger.verbose(`Cron SyncRanking scheduled at ${this.cronSyncRanking}`);
  }

  public QueueingCheckEncounters() {
    const job = CronJob.from({
      cronTime: this.cronCheckEncounters,
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

    this.logger.verbose(`Cron CheckEncounters scheduled at ${this.cronCheckEncounters}`);
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
