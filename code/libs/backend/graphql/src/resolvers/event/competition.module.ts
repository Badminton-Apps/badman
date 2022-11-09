import { AssemblyModule } from '@badman/backend-assembly';
import { DatabaseModule } from '@badman/backend-database';
import { NotificationsModule } from '@badman/backend-notifications';
import { QueueModule } from '@badman/backend-queue';
import { Module } from '@nestjs/common';
import {
  DrawCompetitionResolver,
  EncounterChangeCompetitionResolver,
  EncounterCompetitionResolver,
  EventCompetitionResolver,
  SubEventCompetitionResolver,
  AssemblyResolver
} from './competition';

@Module({
  imports: [DatabaseModule, NotificationsModule, QueueModule, AssemblyModule],
  providers: [
    EventCompetitionResolver,
    EncounterCompetitionResolver,
    EncounterChangeCompetitionResolver,
    DrawCompetitionResolver,
    SubEventCompetitionResolver,
    AssemblyResolver
  ],
})
export class CompetitionResolverModule {}
