import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bull';
import { SyncRankingProcessor } from '../processors/ranking';
import { SyncQueue } from '@badman/queue';

@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name);

  constructor(@InjectQueue(SyncQueue) private syncQ: Queue) {}

  @Cron(CronExpression.EVERY_DAY_AT_2PM)
  handleCron() {
    this.logger.debug('Cron');
    this.syncQ.add(SyncRankingProcessor.SyncRanking, 'data');
  }
}
