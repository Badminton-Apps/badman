import { SyncQueue, Sync } from '@badman/backend/queue';
import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bull';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(@InjectQueue(SyncQueue) private rankingQ: Queue) {}

  @Cron(CronExpression.EVERY_DAY_AT_2PM)
  syncEvents() {
    this.logger.debug(`${CronExpression.EVERY_DAY_AT_2PM} Cron triggered`);
    this.rankingQ.add(Sync.SyncEvents, {
      removeOnComplete: true,
      removeOnFail: true,
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_2PM)
  syncRanking() {
    this.logger.debug(`${CronExpression.EVERY_DAY_AT_2PM} Cron triggered`);
    this.rankingQ.add(Sync.SyncRanking, {
      removeOnComplete: true,
      removeOnFail: true,
    });
  }

  // @Cron(CronExpression.EVERY_HOUR)
  // syncEncounter() {
  //   this.logger.debug(`${CronExpression.EVERY_HOUR} Cron triggered`);
  //   this.rankingQ.add(Sync.CheckEncounters, {
  //     removeOnComplete: true,
  //     removeOnFail: true,
  //   });
  // }
}
