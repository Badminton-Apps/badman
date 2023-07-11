import { DatabaseModule } from '@badman/backend-database';
import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CreateLocationAvailibiltyRunner } from './scripts/location-availibilty/location-availibilty';
import { CopyAvailibiltyRunner } from './scripts/location-availibilty/copy-prev-year';

@Module({
  providers: [CreateLocationAvailibiltyRunner, CopyAvailibiltyRunner],
  imports: [ConfigModule.forRoot(), DatabaseModule],
})
export class ScriptModule implements OnModuleInit {
  private readonly logger = new Logger(ScriptModule.name);
  constructor(
    private fixer: CreateLocationAvailibiltyRunner,
    private copy: CopyAvailibiltyRunner
  ) {}

  async onModuleInit() {
    this.logger.log('Running script');
    await this.copy.process();
    await this.fixer.process();
  }
}
