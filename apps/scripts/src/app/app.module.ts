import { DatabaseModule } from '@badman/backend-database';
import { GeneratorModule } from '@badman/backend-generator';
import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AddLocationsId } from './scripts/add-locations-to-cp';
import {
  cpClubsVvbbc,
  cpLocationsVvbbc,
} from './scripts/add-locations-to-cp/clubs-locations';

@Module({
  providers: [AddLocationsId],
  imports: [ConfigModule.forRoot(), DatabaseModule, GeneratorModule],
})
export class ScriptModule implements OnModuleInit {
  private readonly logger = new Logger(ScriptModule.name);
  constructor(private fixer: AddLocationsId) {}

  async onModuleInit() {
    this.logger.log('Running script');

    // await this.fixer.encountersWithLocations(
    //   '2625c52f-fae4-4a81-87ed-6819f44f1dcf',
    //   cpClubsVlaamse,
    //   cpLocationsVlaamse
    // );

    // await this.fixer.encountersWithLocations(
    //   '9d79c7bb-608d-4d32-964a-91def2b96ac2',
    //   cpClubsLimburg,
    //   cpLocationsLimburg
    // );

    await this.fixer.encountersWithLocations(
      'd6f78a29-0c03-44f9-b2bc-81d5f79ff2f7',
      cpClubsVvbbc,
      cpLocationsVvbbc
    );

    this.logger.log('Script finished');
  }
}
