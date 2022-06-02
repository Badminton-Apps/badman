import { Module } from '@nestjs/common';
import { CompetitionModule } from './competition.module';
import { EventEntryResolver } from './entry.resolver';
import { TournamentModule } from './tournament.module';

@Module({
  imports: [CompetitionModule, TournamentModule],
  providers: [EventEntryResolver],
})
export class EventModule {}
