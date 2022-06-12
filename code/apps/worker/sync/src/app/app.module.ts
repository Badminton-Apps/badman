import { QueueModule } from '@badman/queue';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { JobService } from './crons';
import { SyncDateProcessor, SyncRankingProcessor } from './processors';

@Module({
  providers: [SyncDateProcessor, SyncRankingProcessor, JobService],
  imports: [ScheduleModule.forRoot(), QueueModule],
})
export class SyncModule {}
