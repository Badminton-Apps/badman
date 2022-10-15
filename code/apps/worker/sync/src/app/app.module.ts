import { DatabaseModule } from '@badman/backend/database';
import { QueueModule } from '@badman/backend/queue';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CronService } from './crons';
import {
  EnterScoresProcessor,
  SyncDateProcessor,
  CheckEncounterProcessor,
  SyncEventsProcessor,
  SyncRankingProcessor,
  GlobalConsumer,
  CheckRankingProcessor,
} from './processors';
import {
  utilities as nestWinstonModuleUtilities,
  WinstonModule,
} from 'nest-winston';
import { transports, format } from 'winston';
import versionPackage from '../version.json';
import { VisualModule } from '@badman/backend/visual';
import { RankingModule } from '@badman/backend/ranking';
import { NotificationsModule } from '@badman/backend/notifications';

@Module({
  providers: [
    GlobalConsumer,

    SyncDateProcessor,
    SyncRankingProcessor,
    SyncEventsProcessor,
    EnterScoresProcessor,
    CheckEncounterProcessor,
    CheckRankingProcessor,

    CronService,

  ],
  imports: [
    ConfigModule.forRoot(),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        if (configService.get('NODE_ENV') === 'production') {
          return {
            level: 'silly',
            transports: [
              new transports.Console({
                level: 'silly',
                format: format.combine(
                  format.label({ label: versionPackage.version }),
                  format.json()
                ),
              }),
            ],
          };
        } else {
          return {
            level: 'silly',
            transports: [
              new transports.Console({
                level: 'silly',
                format: format.combine(
                  format.label({ label: versionPackage.version }),
                  format.timestamp(),
                  format.ms(),
                  nestWinstonModuleUtilities.format.nestLike('Badman')
                ),
              }),
            ],
          };
        }
      },
      inject: [ConfigService],
    }),
    VisualModule,
    DatabaseModule,
    RankingModule,
    ScheduleModule.forRoot(),
    QueueModule,
    NotificationsModule
  ],
})
export class WorkerSyncModule {}
