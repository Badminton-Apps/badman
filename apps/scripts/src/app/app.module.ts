import { DatabaseModule } from '@badman/backend-database';
import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ExportBBFPlayers } from './scripts/expot-ranking/exort-ranking';
import { configSchema, parseconfig } from '@badman/utils';

@Module({
  providers: [ExportBBFPlayers],
  imports: [
    ConfigModule.forRoot({
      cache: true,
      validationSchema: configSchema,
      load: [parseconfig],
    }),
    DatabaseModule,
  ],
})
export class ScriptModule implements OnModuleInit {
  private readonly logger = new Logger(ScriptModule.name);

  constructor(private fixer: ExportBBFPlayers) {}

  async onModuleInit() {
    this.logger.log('Running script');

    await this.fixer.process(2023, '98a5d635-fd7e-459d-ae09-93a9db49ffdf');

    this.logger.log('Script finished');
  }
}
 