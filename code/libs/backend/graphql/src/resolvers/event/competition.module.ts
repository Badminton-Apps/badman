import { DatabaseModule } from '@badman/backend/database';
import { NotificationsModule } from '@badman/backend/notifications';
import { QueueModule } from '@badman/backend/queue';
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
export class CompetitionResolverModule {}
