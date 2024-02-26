import { DatabaseModule } from '@badman/backend-database';
import { configSchema, load } from '@badman/utils';
import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenVisualService } from './scripts/visual/open-visual.service';

@Module({
  providers: [OpenVisualService],
  imports: [
    ConfigModule.forRoot({
      cache: true,
      validationSchema: configSchema,
      load: [load],
    }),
    DatabaseModule,
  ],
})
export class ScriptModule implements OnModuleInit {
  private readonly logger = new Logger(ScriptModule.name);

  constructor(private fixer: OpenVisualService) {}

  async onModuleInit() {
    this.logger.log('Running script');

    // await this.fixer.process(2023, '98a5d635-fd7e-459d-ae09-93a9db49ffdf');
    await this.fixer.start();

    this.logger.log('Script finished');
  }
}
