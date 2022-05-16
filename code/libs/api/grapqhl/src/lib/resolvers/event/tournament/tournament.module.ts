import { DatabaseModule } from '@badman/api/database';
import { Module } from '@nestjs/common';
import { EventTournamentResolver } from './event-tournament.resolver';

@Module({
  imports: [DatabaseModule],
  providers: [EventTournamentResolver],
})
export class TournamentModule {}
