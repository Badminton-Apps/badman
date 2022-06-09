import { QueueModule, SyncQueue } from '@badman/queue';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { JobService } from './crons';
import { SyncDateProcessor, SyncRankingProcessor } from './processors';

@Module({
  providers: [SyncDateProcessor, SyncRankingProcessor, JobService],
  imports: [
    QueueModule,
    BullModule.registerQueue({
      name: SyncQueue,
    }),
    ScheduleModule.forRoot(),
  ],
})
export class SyncModule {}
