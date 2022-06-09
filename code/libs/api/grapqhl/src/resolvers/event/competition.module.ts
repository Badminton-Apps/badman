import { DatabaseModule } from '@badman/api/database';
import { BullModule } from '@nestjs/bull';
import { forwardRef, Module } from '@nestjs/common';
import {
  EncounterCompetitionResolver,
  EventCompetitionResolver,
  DrawCompetitionResolver,
  SubEventCompetitionResolver,
} from './competition';
import { SyncQueue } from '@badman/queue';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: SyncQueue,
    }),
  ],
  providers: [
    EventCompetitionResolver,
    EncounterCompetitionResolver,
    DrawCompetitionResolver,
    SubEventCompetitionResolver,
  ],
})
export class CompetitionModule {}
