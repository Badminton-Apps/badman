import { DatabaseModule } from '@badman/backend-database';
import { GeneratorModule } from '@badman/backend-generator';
import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AddLocationsId } from './scripts/add-locations-to-cp';

@Module({
  providers: [AddLocationsId],
  imports: [ConfigModule.forRoot(), DatabaseModule, GeneratorModule],
})
export class ScriptModule implements OnModuleInit {
  private readonly logger = new Logger(ScriptModule.name);
  constructor(private fixer: AddLocationsId) {}

  async onModuleInit() {
    this.logger.log('Running script');

    await this.fixer.encountersWithLocations('2625c52f-fae4-4a81-87ed-6819f44f1dcf');

    this.logger.log('Script finished');
  }
}
