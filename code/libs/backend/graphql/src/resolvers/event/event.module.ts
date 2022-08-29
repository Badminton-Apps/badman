import { Module } from '@nestjs/common';
import { CompetitionResolverModule } from './competition.module';
import {
  EventEntryResolver,
  EntryCompetitionPlayersResolver,
} from './entry.resolver';
import { TournamentResolverModule } from './tournament.module';

@Module({
  imports: [CompetitionResolverModule, TournamentResolverModule],
  providers: [EventEntryResolver, EntryCompetitionPlayersResolver],
})
export class EventResolverModule {}
