import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AppController, PdfController, RankingController } from './controllers';

import { DatabaseModule } from '@badman/api/database';
import { GeneratorModule } from '@badman/api/generator';
import { ApiGrapqhlModule } from '@badman/api/grapqhl';
import { QueueModule } from '@badman/queue';
import { SearchModule } from '@badman/search';
import { EventsModule } from './events';
import { PdfService } from './services';
import { HealthModule } from '@badman/health';
import { HandlebarModule } from '@badman/handlebar';

@Module({
  imports: [
    ConfigModule.forRoot(),
    HandlebarModule,
    GeneratorModule,
    DatabaseModule,
    ApiGrapqhlModule,
    SearchModule,
    QueueModule,
    EventsModule,
    HealthModule,
  ],
  controllers: [AppController, PdfController, RankingController],
  providers: [PdfService],
})
export class AppModule {
  private readonly logger = new Logger(AppModule.name);
  constructor(configService: ConfigService) {
    this.logger.log(
      `${AppModule.name} loaded, env: ${configService.get('NODE_ENV')}`
    );
  }
}
