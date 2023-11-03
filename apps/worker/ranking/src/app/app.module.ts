import { DatabaseModule } from '@badman/backend-database';
import { LoggingModule } from '@badman/backend-logging';
import { QueueModule } from '@badman/backend-queue';
import { RankingModule } from '@badman/backend-ranking';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import versionPackage from '../version.json';
import { SimulationProcessor } from './processors';

@Module({
  imports: [
    ConfigModule.forRoot(),
    LoggingModule.forRoot({
      version: versionPackage.version,
      name: 'worker-ranking',
    }),
    QueueModule,
    DatabaseModule,
    RankingModule,
  ],
  providers: [SimulationProcessor],
})
export class AppModule {}
