import { DatabaseModule } from '@badman/api/database';
import { QueueModule } from '@badman/queue';
import { Module } from '@nestjs/common';
import {
  DrawCompetitionResolver,
  EncounterCompetitionResolver,
  EventCompetitionResolver,
  SubEventCompetitionResolver,
} from './competition';

@Module({
  imports: [DatabaseModule, QueueModule],
  providers: [
    EventCompetitionResolver,
    EncounterCompetitionResolver,
    DrawCompetitionResolver,
    SubEventCompetitionResolver,
  ],
})
export class CompetitionModule {}
