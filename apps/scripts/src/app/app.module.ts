import { DatabaseModule } from '@badman/backend-database';
import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ExportBBFPlayers } from './scripts/expot-ranking/exort-ranking';

@Module({
  providers: [ExportBBFPlayers],
  imports: [ConfigModule.forRoot(), DatabaseModule],
})
export class ScriptModule implements OnModuleInit {
  private readonly logger = new Logger(ScriptModule.name);

  constructor(private fixer: ExportBBFPlayers) {}

  async onModuleInit() {
    this.logger.log('Running script');

    await this.fixer.process(2023);

    this.logger.log('Script finished');
  }
}
