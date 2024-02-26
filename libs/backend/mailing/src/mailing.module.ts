import { DatabaseModule } from '@badman/backend-database';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CompileModule } from '@badman/backend-compile';
import { MailingService } from './services';
import { join } from 'path';
import { ConfigType } from '@badman/utils';

@Module({
  imports: [
    CompileModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService<ConfigType>) => ({
        view: {
          root: join(__dirname, 'compile', 'libs', 'mailing'),
          engine: 'pug',
        },
        debug: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
    ConfigModule,
  ],
  providers: [MailingService],
  exports: [MailingService],
})
export class MailingModule {}
