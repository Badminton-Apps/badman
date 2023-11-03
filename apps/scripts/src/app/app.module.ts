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

    await this.fixer.process(2023, '5a078171-e06e-47fa-9dea-3425476493c6');
    await this.fixer.process(2023, 'f1d9526d-aa2d-4593-93dd-81e17cd450a4');
    await this.fixer.process(2023, 'f8e72d15-0524-4e15-929a-80c0ee4b64cb');
    await this.fixer.process(2023, '29496977-62bb-4f19-9e44-7534a9dec3f6');
    await this.fixer.process(2023, '3a82bf35-7cd7-4240-a72f-6301ce6ea578');


    this.logger.log('Script finished');
  }
}
