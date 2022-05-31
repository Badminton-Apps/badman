import { DatabaseModule } from '@badman/api/database';
import { Module } from '@nestjs/common';
import {
  EventTournamentResolver,
  DrawTournamentResolver,
  SubEventTournamentResolver,
} from './tournament';

@Module({
  imports: [DatabaseModule],
  providers: [
    EventTournamentResolver,
    DrawTournamentResolver,
    SubEventTournamentResolver,
  ],
})
export class TournamentModule {}
