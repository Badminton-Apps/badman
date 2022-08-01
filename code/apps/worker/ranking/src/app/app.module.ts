import { DatabaseModule } from '@badman/api/database';
import { QueueModule } from '@badman/queue';
import { RankingModule } from '@badman/ranking';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SimulationProcessor, SimulationV2Processor } from './processors';
import {
  utilities as nestWinstonModuleUtilities,
  WinstonModule,
} from 'nest-winston';
import * as winston from 'winston';

@Module({
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
    QueueModule,
    DatabaseModule,
    RankingModule,
  ],
  providers: [SimulationProcessor, SimulationV2Processor],
})
export class WorkerRankingModule {}
