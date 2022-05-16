import { DatabaseModule } from '@badman/api/database';
import { Module } from '@nestjs/common';
import { EventCompetitionResolver } from './event-competition.resolver';

@Module({
  imports: [DatabaseModule],
  providers: [EventCompetitionResolver],
})
export class CompetitionModule {}
