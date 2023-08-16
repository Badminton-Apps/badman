import { DatabaseModule } from '@badman/backend-database';
import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IncorrectEncountersService } from './scripts/incorrect-change-encounters';

@Module({
  providers: [IncorrectEncountersService],
  imports: [ConfigModule.forRoot(), DatabaseModule],
})
export class ScriptModule implements OnModuleInit {
  private readonly logger = new Logger(ScriptModule.name);
  constructor(private fixer: IncorrectEncountersService) {}

  async onModuleInit() {
    this.logger.log('Running script');
    await this.fixer.getIncorrectEncountersService(2023);
  }
}
