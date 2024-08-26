import { DatabaseModule } from '@badman/backend-database';
import { Module } from '@nestjs/common';
import { ChangeEncounterController } from './controllers/notifiy.controller';
import { EncounterValidationService } from './services/validate';

@Module({
  imports: [DatabaseModule],
  providers: [EncounterValidationService],
  exports: [EncounterValidationService],
  controllers: [ChangeEncounterController],
})
export class ChangeEncounterModule {}
