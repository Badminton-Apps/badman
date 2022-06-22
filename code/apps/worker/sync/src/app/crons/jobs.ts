import { SyncQueue, Sync } from '@badman/queue';
import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bull';

@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name);

  constructor(@InjectQueue(SyncQueue) private rankingQ: Queue) {}

  @Cron(CronExpression.EVERY_DAY_AT_2PM)
  handleCron() {
    this.logger.debug(`${CronExpression.EVERY_DAY_AT_2PM} Cron triggered`);
    this.rankingQ.add(Sync.SyncEvents);
  }
}
