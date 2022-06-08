import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';

import { AppController } from './controllers';

import { ApiGrapqhlModule } from '@badman/api/grapqhl';
import { DatabaseModule } from '@badman/api/database';
import { GeneratorModule } from '@badman/api/generator';
import { SearchModule } from '@badman/search';

@Module({
  imports: [
    ConfigModule.forRoot(),
    GeneratorModule,
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
export class AppModule {
  private readonly logger = new Logger(AppModule.name);
  constructor() {
    this.logger.log(`${AppModule.name} loaded, env: ${process.env.NODE_ENV}`);
  }
}
