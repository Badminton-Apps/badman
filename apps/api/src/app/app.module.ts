import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController, ImageController } from './controllers';

import { AuthorizationModule } from '@badman/backend-authorization';
import { DatabaseModule } from '@badman/backend-database';
import { GeneratorModule } from '@badman/backend-generator';
import { GrapqhlModule } from '@badman/backend-graphql';
import { HealthModule } from '@badman/backend-health';
import { LoggingModule } from '@badman/backend-logging';
import { MailingModule } from '@badman/backend-mailing';
import { NotificationsModule } from '@badman/backend-notifications';
import { OrchestratorModule } from '@badman/backend-orchestrator';
import { QueueModule } from '@badman/backend-queue';
import { SearchModule } from '@badman/backend-search';
import { SocketModule } from '@badman/backend-socket';
import { TranslateModule } from '@badman/backend-translate';
import { TwizzitModule } from '@badman/backend-twizzit';
import { configSchema, parseconfig } from '@badman/utils';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import versionPackage from '../version.json';

const productionModules = [];
if (process.env.NODE_ENV === 'production') {
  productionModules.push(
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'badman'),
      exclude: ['api/*', '/graphql'],
    }),
  );
}

@Module({
  imports: [
    ...productionModules,
    ConfigModule.forRoot({
      cache: true,
      validationSchema: configSchema,
      load: [parseconfig],
    }),
    AuthorizationModule,
    GrapqhlModule,
    DatabaseModule,

    // Lib modules
    LoggingModule.forRoot({
      version: versionPackage.version,
      name: 'api',
    }),
    TwizzitModule,
    MailingModule,
    NotificationsModule,
    GeneratorModule,
    SearchModule,
    QueueModule,
    HealthModule,
    TranslateModule,
    OrchestratorModule,
    SocketModule,
  ],
  controllers: [AppController, ImageController],
  providers: [Logger],
})
export class AppModule {
  private readonly logger = new Logger(AppModule.name);

  constructor(configService: ConfigService) {
    this.logger.log(
      `${AppModule.name} loaded, env: ${configService.get('NODE_ENV')}`,
    );
  }
}
