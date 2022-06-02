import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';

import { AppController } from './controllers';

import { ApiGrapqhlModule } from '@badman/api/grapqhl';
import { DatabaseModule } from '@badman/api/database';
import { SearchModule } from '@badman/search';

@Module({
  imports: [
    ConfigModule.forRoot(),
    DatabaseModule,
    ApiGrapqhlModule,
    SearchModule,
    BullModule.registerQueue({
      name: 'ranking-queue',
      redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT, 10),
      },
    }),
    BullModule.registerQueue({
      name: 'sync-queue',
      redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT, 10),
      },
    }),
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
