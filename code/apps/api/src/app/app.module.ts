import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { DatabaseModule } from '@badman/api/database';

import { AppController } from './controllers';
import { AppService } from './services';
import { ApiGrapqhlModule } from '@badman/api-grapqhl';

@Module({
  imports: [
    ConfigModule.forRoot(),
    DatabaseModule,
    ApiGrapqhlModule,
    BullModule.registerQueue({
      name: 'ranking-queue',
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),
    BullModule.registerQueue({
      name: 'sync-queue',
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
