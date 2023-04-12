import { AssemblyModule } from '@badman/backend-assembly';
import { DatabaseModule } from '@badman/backend-database';
import { NotificationsModule } from '@badman/backend-notifications';
import { QueueModule } from '@badman/backend-queue';
import { RankingModule } from '@badman/backend-ranking';
import { Module } from '@nestjs/common';
import {
  DrawCompetitionResolver,
  EncounterChangeCompetitionResolver,
  EncounterCompetitionResolver,
  EventCompetitionResolver,
  SubEventCompetitionResolver,
  AssemblyResolver,
  EnrollmentResolver,
} from './competition';
import { CacheModule } from '@badman/backend-cache';
import { EnrollmentModule } from '@badman/backend-enrollment';

@Module({
  imports: [
    DatabaseModule,
    NotificationsModule,
    QueueModule,
    AssemblyModule,
    EnrollmentModule,
    RankingModule,
    CacheModule,
  ],
  providers: [
    EventCompetitionResolver,
    EncounterCompetitionResolver,
    EncounterChangeCompetitionResolver,
    DrawCompetitionResolver,
    SubEventCompetitionResolver,
    AssemblyResolver,
    EnrollmentResolver,
  ],
})
export class CompetitionResolverModule {}
