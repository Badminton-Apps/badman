import { DatabaseModule } from '@badman/api/database';
import { QueueModule } from '@badman/queue';
import { Module } from '@nestjs/common';
import { PointsService, CalculationService, PlaceService } from './services';

@Module({
  controllers: [],
  imports: [DatabaseModule, QueueModule],
  providers: [PointsService, CalculationService, PlaceService],
  exports: [CalculationService],
})
export class RankingModule {}
