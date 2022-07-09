import { DatabaseModule } from '@badman/api/database';
import { QueueModule } from '@badman/queue';
import { Module } from '@nestjs/common';
import { SimulationProcessor, SimulationV2Processor } from './processors';

@Module({
  imports: [QueueModule, DatabaseModule],
  providers: [SimulationProcessor, SimulationV2Processor],
})
export class RankingModule {}
