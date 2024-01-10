import { DatabaseModule } from '@badman/backend-database';
import { LoggingModule } from '@badman/backend-logging';
import { QueueModule } from '@badman/backend-queue';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import versionPackage from '../version.json';
import { PointProcessor } from './points.processor';
import { BelgiumFlandersPointsModule } from '@badman/belgium-flanders-points';
import { configSchema, load } from '@badman/utils';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      validationSchema: configSchema,
      load: [load],
    }),
    LoggingModule.forRoot({
      version: versionPackage.version,
      name: 'worker-belgium-flanders-points',
    }),
    QueueModule,
    DatabaseModule,
    BelgiumFlandersPointsModule,
  ],
  providers: [PointProcessor],
})
export class AppModule {}
