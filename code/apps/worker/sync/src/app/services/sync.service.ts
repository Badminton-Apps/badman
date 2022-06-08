import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bull';
import { RankingComsumer } from '../processors/ranking';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(@InjectQueue('sync-queue') private syncQ: Queue) {}

  @Cron(CronExpression.EVERY_DAY_AT_2PM)
  handleCron() {
    this.logger.debug('Cron');
    this.syncQ.add(RankingComsumer.SyncRanking, 'data');
  }
}
