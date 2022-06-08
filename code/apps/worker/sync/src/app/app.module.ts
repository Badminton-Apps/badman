import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { RankingComsumer } from './processors/ranking';
import { ScheduleModule } from '@nestjs/schedule';
import { JobService } from './crons/jobs';

@Module({
  providers: [RankingComsumer, JobService],
  imports: [
    ScheduleModule.forRoot(),
    BullModule.registerQueue({
      name: 'sync-queue',
      redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT, 10),
      },
    }),
  ],
})
export class SyncModule {}
