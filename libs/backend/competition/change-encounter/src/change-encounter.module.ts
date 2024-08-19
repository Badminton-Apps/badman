import { DatabaseModule } from '@badman/backend-database';
import { Module } from '@nestjs/common';
import { EncounterValidationService } from './services/validate';

@Module({
  imports: [DatabaseModule],
  providers: [EncounterValidationService],
  exports: [EncounterValidationService],
  controllers: [],
})
export class ChangeEncounterModule {}
