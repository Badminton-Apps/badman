import { InjectQueue } from '@nestjs/bull';
import { Controller, Get, Logger } from '@nestjs/common';
import { Queue } from 'bull';
import { AppService } from '../services';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    @InjectQueue('ranking-queue') private rankingQ: Queue
  ) {}

  @Get('hello')
  getData() {
    return this.appService.getData();
  }

  @Get('queue')
  getQueue() {
    this.logger.debug('Queue');
    return this.rankingQ.add('namedjob', 'data');
  }
}
