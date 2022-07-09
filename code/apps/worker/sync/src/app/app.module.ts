import { DatabaseModule } from '@badman/api/database';
import { QueueModule } from '@badman/queue';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CronService } from './crons';
import {
  EnterScoresProcessor,
  SyncDateProcessor,
  CheckEncounterProcessor,
  SyncEventsProcessor,
  SyncRankingProcessor,
} from './processors';
import { VisualService } from './services';

@Module({
  providers: [
    SyncDateProcessor,
    SyncRankingProcessor,
    SyncEventsProcessor,
    EnterScoresProcessor,
    CheckEncounterProcessor,

    CronService,

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
