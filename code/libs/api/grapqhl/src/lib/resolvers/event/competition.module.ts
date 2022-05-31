import { DatabaseModule } from '@badman/api/database';
import { Module } from '@nestjs/common';
import {
  EncounterCompetitionResolver,
  EventCompetitionResolver,
  DrawCompetitionResolver,
  SubEventCompetitionResolver,
} from './competition';

@Module({
  imports: [DatabaseModule],
  providers: [
    EventCompetitionResolver,
    EncounterCompetitionResolver,
    DrawCompetitionResolver,
    SubEventCompetitionResolver,
  ],
})
export class CompetitionModule {}
