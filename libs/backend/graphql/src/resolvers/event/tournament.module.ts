import { DatabaseModule } from '@badman/backend-database';
import { RankingModule } from '@badman/backend-ranking';
import { Module } from '@nestjs/common';
import {
  EventTournamentResolver,
  DrawTournamentResolver,
  SubEventTournamentResolver,
} from './tournament';

@Module({
  imports: [DatabaseModule, RankingModule],
  providers: [EventTournamentResolver, DrawTournamentResolver, SubEventTournamentResolver],
})
export class TournamentResolverModule {}
