import { Injectable as Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';

@Inject()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private configService: ConfigService,
  ) {
  }

  // Run every day at 6am
  @Cron('0 6 * * *')
  async cron() {
    this.logger.log('Cron job is running');

  }
}
