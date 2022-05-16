import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bull';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(@InjectQueue('sync-queue') private syncQ: Queue) {}

  @Cron(CronExpression.EVERY_DAY_AT_2PM)
  handleCron() {
    this.logger.debug('Cron');
    this.syncQ.add('namedjob', 'data');
  }
}
