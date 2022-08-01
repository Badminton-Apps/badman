import { DatabaseModule } from '@badman/api/database';
import { QueueModule } from '@badman/queue';
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
import * as winston from 'winston';

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
            transports: [
              new winston.transports.Console({
                format: winston.format.combine(winston.format.json()),
              }),
            ],
          };
        } else {
          return {
            transports: [
              new winston.transports.Console({
                format: winston.format.combine(
                  winston.format.timestamp(),
                  nestWinstonModuleUtilities.format.nestLike()
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
