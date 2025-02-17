import { DatabaseModule } from '@badman/backend-database';
import { RankingModule } from '@badman/backend-ranking';
import { Module } from '@nestjs/common';
import {
  EventTournamentResolver,
  DrawTournamentResolver,
  SubEventTournamentResolver,
} from './tournament';
import { QueueModule } from '@badman/backend-queue';

@Module({
  imports: [DatabaseModule, RankingModule, QueueModule],
  providers: [EventTournamentResolver, DrawTournamentResolver, SubEventTournamentResolver],
})
export class TournamentResolverModule {}
