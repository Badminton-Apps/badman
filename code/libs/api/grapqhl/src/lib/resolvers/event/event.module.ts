import { Module } from '@nestjs/common';
import { CompetitionModule } from './competition';
import { TournamentModule } from './tournament';

@Module({
  imports: [CompetitionModule, TournamentModule],
  providers: [],
})
export class EventModule {}
