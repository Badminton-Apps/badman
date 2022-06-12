import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './controllers';

import { DatabaseModule } from '@badman/api/database';
import { GeneratorModule } from '@badman/api/generator';
import { ApiGrapqhlModule } from '@badman/api/grapqhl';
import { QueueModule } from '@badman/queue';
import { SearchModule } from '@badman/search';

@Module({
  imports: [
    ConfigModule.forRoot(),
    GeneratorModule,
    DatabaseModule,
    ApiGrapqhlModule,
    SearchModule,
    QueueModule,
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
