import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController, PdfController } from './controllers';

import { DatabaseModule } from '@badman/api/database';
import { GeneratorModule } from '@badman/api/generator';
import { ApiGrapqhlModule } from '@badman/api/grapqhl';
import { QueueModule } from '@badman/queue';
import { SearchModule } from '@badman/search';
import { EventsModule } from './events/events.module';
import { PdfService } from './services';

@Module({
  imports: [
    ConfigModule.forRoot(),
    GeneratorModule,
    DatabaseModule,
    ApiGrapqhlModule,
    SearchModule,
    QueueModule,
    EventsModule,
  ],
  controllers: [AppController, PdfController],
  providers: [PdfService],
})
export class AppModule {
  private readonly logger = new Logger(AppModule.name);
  constructor() {
    this.logger.log(`${AppModule.name} loaded, env: ${process.env.NODE_ENV}`);
  }
}
