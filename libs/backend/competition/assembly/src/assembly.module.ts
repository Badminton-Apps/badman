import { CompileModule } from '@badman/backend-compile';
import { DatabaseModule } from '@badman/backend-database';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { AssemblyController } from './controllers';
import { AssemblyService } from './services';

@Module({
  imports: [
    DatabaseModule,
    CompileModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        view: {
          root: join(__dirname, 'compile', 'libs', 'assembly'),
          engine: 'pug',
        },
        juice: {
          webResources: {
            links: true,
          },
        },
        debug: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AssemblyService],
  exports: [AssemblyService],
  controllers: [AssemblyController],
})
export class AssemblyModule {}
