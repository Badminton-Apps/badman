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
} from './competition';
import { CacheModule } from '@badman/backend-cache';

@Module({
  imports: [
    DatabaseModule,
    NotificationsModule,
    QueueModule,
    AssemblyModule,
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
  ],
})
export class CompetitionResolverModule {}
