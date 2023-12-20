import { DatabaseModule } from '@badman/backend-database';
import { LoggingModule } from '@badman/backend-logging';
import { QueueModule } from '@badman/backend-queue';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import versionPackage from '../version.json';
import { PlacesProcessor } from './places.processor';
import { BelgiumFlandersPlacesModule } from '@badman/belgium-flanders-places';
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
      name: 'worker-belgium-flanders-places',
    }),
    QueueModule,
    DatabaseModule,
    BelgiumFlandersPlacesModule
  ],
  providers: [PlacesProcessor],
})
export class AppModule {}
