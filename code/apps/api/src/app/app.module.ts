import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './controllers';

import { ApiGrapqhlModule } from '@badman/api/grapqhl';
import { DatabaseModule } from '@badman/api/database';
import { GeneratorModule } from '@badman/api/generator';
import { SearchModule } from '@badman/search';
import { QueueModule, SyncQueue } from '@badman/queue';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    ConfigModule.forRoot(),
    GeneratorModule,
    DatabaseModule,
    ApiGrapqhlModule,
    SearchModule,
    QueueModule,
    BullModule.registerQueue({
      name: SyncQueue,
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
 