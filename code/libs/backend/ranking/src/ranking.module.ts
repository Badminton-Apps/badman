import { DatabaseModule } from '@badman/backend/database';
import { QueueModule } from '@badman/backend/queue';
import { Module } from '@nestjs/common';
import { PointsService, CalculationService, PlaceService } from './services';

@Module({
  controllers: [],
  imports: [DatabaseModule, QueueModule],
  providers: [PointsService, CalculationService, PlaceService],
  exports: [CalculationService, PointsService],
})
export class RankingModule {}
