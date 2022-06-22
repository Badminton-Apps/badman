import { DatabaseModule } from '@badman/api/database';
import { QueueModule } from '@badman/queue';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { JobService } from './crons';
import {
  SyncDateProcessor,
  SyncEventsProcessor,
  SyncRankingProcessor,
} from './processors';
import { VisualService } from './services';

@Module({
  providers: [
    SyncDateProcessor,
    SyncRankingProcessor,
    SyncEventsProcessor,
    JobService,
    VisualService,
  ],
  imports: [
    ConfigModule,
    DatabaseModule,
    ScheduleModule.forRoot(),
    QueueModule,
  ],
})
export class SyncModule {}
