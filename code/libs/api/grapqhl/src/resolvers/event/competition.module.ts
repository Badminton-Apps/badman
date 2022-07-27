import { DatabaseModule } from '@badman/api/database';
import { NotificationsModule } from '@badman/notifications';
import { QueueModule } from '@badman/queue';
import { Module } from '@nestjs/common';
import {
  DrawCompetitionResolver,
  EncounterChangeCompetitionResolver,
  EncounterCompetitionResolver,
  EventCompetitionResolver,
  SubEventCompetitionResolver,
} from './competition';

@Module({
  imports: [DatabaseModule, NotificationsModule, QueueModule],
  providers: [
    EventCompetitionResolver,
    EncounterCompetitionResolver,
    EncounterChangeCompetitionResolver,
    DrawCompetitionResolver,
    SubEventCompetitionResolver,
  ],
})
export class CompetitionModule {}
