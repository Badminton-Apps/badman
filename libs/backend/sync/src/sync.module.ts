import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { CronService } from './cron/cron';

@Module({
  imports: [ScheduleModule.forRoot(), ConfigModule],
  providers: [CronService],
  exports: [],
})
export class SyncModule {}
