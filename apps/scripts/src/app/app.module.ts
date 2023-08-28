import { DatabaseModule } from '@badman/backend-database';
import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IncorrectEncountersService } from './scripts/incorrect-change-encounters';
import { VisualModule } from '@badman/backend-visual';

@Module({
  providers: [IncorrectEncountersService],
  imports: [ConfigModule.forRoot(), DatabaseModule, VisualModule],
})
export class ScriptModule implements OnModuleInit {
  private readonly logger = new Logger(ScriptModule.name);
  constructor(private fixer: IncorrectEncountersService) {}

  async onModuleInit() {
    this.logger.log('Running script');
    await this.fixer.sendEncountersToVisual(2023);

    this.logger.log('Script finished');
  }
}