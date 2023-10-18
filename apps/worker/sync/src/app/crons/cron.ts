import { Sync, SyncQueue } from '@badman/backend-queue';
import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Queue } from 'bull';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(@InjectQueue(SyncQueue) private readonly syncQ: Queue) {}

  @Cron('15 */4 * * *', {
    name: Sync.SyncEvents,
    timeZone: 'Europe/Paris',
  })
  public QueueingSyncEvents() {
    this.logger.verbose('Queueing SyncEvents');

    this.syncQ.add(Sync.SyncEvents, null, {
      removeOnFail: 1,
      removeOnComplete: true,
    });
  }

  @Cron('0 18 * * *', {
    name: Sync.SyncRanking,
    timeZone: 'Europe/Paris',
  })
  public QueueingSyncRanking() {
    this.logger.verbose('Queueing SyncRanking');

    this.syncQ.add(Sync.SyncRanking, null, {
      removeOnFail: 1,
      removeOnComplete: true,
    });
  }

  @Cron('30 */4 * * *', {
    name: Sync.CheckEncounters,
    timeZone: 'Europe/Paris',
  })
  public QueueingCheckEncounters() {
    this.logger.verbose('Queueing CheckEncounters');

    this.syncQ.add(Sync.CheckEncounters, null, {
      removeOnFail: 1,
      removeOnComplete: true,
    });
  }
}
