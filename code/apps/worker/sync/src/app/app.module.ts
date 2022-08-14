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
} from './processors';
import { VisualService } from './services';
import {
  utilities as nestWinstonModuleUtilities,
  WinstonModule,
} from 'nest-winston';
import { transports, format } from 'winston';
import versionPackage from '../version.json';

@Module({
  providers: [
    GlobalConsumer,

    SyncDateProcessor,
    SyncRankingProcessor,
    SyncEventsProcessor,
    EnterScoresProcessor,
    CheckEncounterProcessor,

    CronService,

    VisualService,
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
    DatabaseModule,
    ScheduleModule.forRoot(),
    QueueModule,
  ],
})
export class WorkerSyncModule {}
