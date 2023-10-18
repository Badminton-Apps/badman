import { Sync, SyncQueue } from '@badman/backend-queue';
import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
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
    this.logger.log(`Scheduling cron jobs`);

    // if not in production, offset the cron jobs by 15 minute
    this.offset = this.configSerive.get('NODE_ENV') === 'production' ? 0 : 15;
  }

  public QueueingSyncEvents() {
    const job = new CronJob({
      cronTime: `${15 + this.offset} */4 * * *`,
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
  }

  public QueueingSyncRanking() {
    const job = new CronJob({
      cronTime: `${0 + this.offset} 18 * * *`,
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
  }

  public QueueingCheckEncounters() {
    const job = new CronJob({
      cronTime: `${30 + this.offset} */4 * * *`,
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
  }
}
