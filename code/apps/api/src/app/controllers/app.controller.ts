import { InjectQueue } from '@nestjs/bull';
import { Controller, Get, Logger } from '@nestjs/common';
import { Queue } from 'bull';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(@InjectQueue('ranking-queue') private rankingQ: Queue) {}

  @Get('queue')
  getQueue() {
    this.logger.debug('Queue');
    return this.rankingQ.add('namedjob', 'data');
  }
}
