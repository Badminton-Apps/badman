import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { SyncConsumer } from './processors/ranking';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksService } from './services/sync.service';

@Module({
  providers: [SyncConsumer, TasksService],
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
