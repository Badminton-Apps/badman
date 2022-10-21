import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AppController, PdfController, RankingController } from './controllers';

import { DatabaseModule } from '@badman/backend-database';
import { GeneratorModule } from '@badman/backend-generator';
import { ApiGrapqhlModule } from '@badman/backend-graphql';
import { HealthModule } from '@badman/backend-health';
import { QueueModule } from '@badman/backend-queue';
import { SearchModule } from '@badman/backend-search';
import {
  utilities as nestWinstonModuleUtilities,
  WinstonModule,
} from 'nest-winston';
import { format, transports } from 'winston';
import versionPackage from '../version.json';
import { EventsModule } from './events';
import { ApiAuthorizationModule } from '@badman/backend-authorization';
import { TwizzitModule } from '@badman/backend-twizzit'; 
import { NotificationsModule } from '@badman/backend-notifications';
import { PdfModule } from '@badman/backend-pdf';
@Module({
  imports: [
    ConfigModule.forRoot(),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        if (configService.get('NODE_ENV') === 'production') {
          return {
            level: 'silly',
            transports: [
              new transports.Console({
                level: 'silly',
                format: format.combine(
                  format.label({ label: versionPackage.version }),
                  format.json()
                ),
              }),
            ],
          };
        } else {
          return {
            level: 'silly',
            transports: [
              new transports.Console({
                level: 'silly',
                format: format.combine(
                  format.label({ label: versionPackage.version }),
                  format.timestamp(),
                  format.ms(),
                  nestWinstonModuleUtilities.format.nestLike('Badman')
                ),
              }),
            ],
          };
        }
      },
      inject: [ConfigService],
    }),
    ApiAuthorizationModule,
    ApiGrapqhlModule,
    DatabaseModule,

    // Lib modules
    TwizzitModule,
    NotificationsModule,
    PdfModule,
    GeneratorModule,
    SearchModule,
    QueueModule,
    EventsModule,
    HealthModule,
  ],
  controllers: [AppController, PdfController, RankingController],
  providers: [Logger],
})
export class AppModule {
  private readonly logger = new Logger(AppModule.name);
  constructor(configService: ConfigService) {
    this.logger.log(
      `${AppModule.name} loaded, env: ${configService.get('NODE_ENV')}`
    );
  }
}
