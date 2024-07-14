import { AssemblyModule } from '@badman/backend-assembly';
import { CacheModule } from '@badman/backend-cache';
import { DatabaseModule } from '@badman/backend-database';
import { EnrollmentModule } from '@badman/backend-enrollment';
import { NotificationsModule } from '@badman/backend-notifications';
import { QueueModule } from '@badman/backend-queue';
import { RankingModule } from '@badman/backend-ranking';
import { Module } from '@nestjs/common';
import {
  AssemblyResolver,
  DrawCompetitionResolver,
  EncounterChangeCompetitionResolver,
  EncounterCompetitionResolver,
  EnrollmentResolver,
  EventCompetitionResolver,
  SubEventCompetitionResolver,
} from './competition';
import { ChangeEncounterModule } from '@badman/backend-change-encounter';

@Module({
  imports: [
    DatabaseModule,
    NotificationsModule,
    QueueModule,
    AssemblyModule,
    ChangeEncounterModule,
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
