import { Module } from '@nestjs/common';
import { CompetitionResolverModule } from './competition.module';
import {
  EventEntryResolver,
  EntryCompetitionPlayersResolver,
} from './entry.resolver';
import { TournamentResolverModule } from './tournament.module';
import { NotificationsModule } from '@badman/backend-notifications';

@Module({
  imports: [
    CompetitionResolverModule,
    TournamentResolverModule,
    NotificationsModule,
  ],
  providers: [EventEntryResolver, EntryCompetitionPlayersResolver],
})
export class EventResolverModule {}
