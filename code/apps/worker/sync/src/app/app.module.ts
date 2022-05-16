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
        host: 'localhost',
        port: 6379,
      },
    }),
  ],
})
export class SyncModule {}
