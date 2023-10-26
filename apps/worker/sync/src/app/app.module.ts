import { TranslateModule } from '@badman/backend-translate';
import { DatabaseModule } from '@badman/backend-database';
import { LoggingModule } from '@badman/backend-logging';
import { NotificationsModule } from '@badman/backend-notifications';
import { QueueModule } from '@badman/backend-queue';
import { RankingModule } from '@badman/backend-ranking';
import { VisualModule } from '@badman/backend-visual';
import { SearchModule } from '@badman/backend-search';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import versionPackage from '../version.json';
import { CronService } from './crons';
import {
  CheckEncounterProcessor,
  CheckRankingProcessor,
  EnterScoresProcessor,
  GlobalConsumer,
  SyncDateProcessor,
  SyncEventsProcessor,
  SyncRankingProcessor,
} from './processors';

@Module({
  providers: [
    GlobalConsumer,

    SyncDateProcessor,
    SyncRankingProcessor,
    SyncEventsProcessor,
    EnterScoresProcessor,
    CheckEncounterProcessor,
    CheckRankingProcessor,
    SearchModule,

    CronService,
  ],
  imports: [
    ConfigModule.forRoot(),
    // Lib modules
    LoggingModule.forRoot({
      version: versionPackage.version,
      name: 'worker-sync',
    }),
    DatabaseModule,
    RankingModule,
    ScheduleModule.forRoot(),
    QueueModule,
    NotificationsModule,
    VisualModule,
    TranslateModule,
  ],
})
export class WorkerSyncModule {}
