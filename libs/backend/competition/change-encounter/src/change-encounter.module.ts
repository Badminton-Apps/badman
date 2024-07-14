import { DatabaseModule } from '@badman/backend-database';
import { Module } from '@nestjs/common';
import { ChangeEncounterValidationService } from './services/validate';

@Module({
  imports: [DatabaseModule],
  providers: [ChangeEncounterValidationService],
  exports: [ChangeEncounterValidationService],
  controllers: [],
})
export class ChangeEncounterModule {}
