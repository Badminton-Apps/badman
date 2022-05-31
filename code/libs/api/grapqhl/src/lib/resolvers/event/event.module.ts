import { Module } from '@nestjs/common';
import { CompetitionModule } from './competition.module';
import { TournamentModule } from './tournament.module';

@Module({
  imports: [CompetitionModule, TournamentModule],
  providers: [],
})
export class EventModule {}
