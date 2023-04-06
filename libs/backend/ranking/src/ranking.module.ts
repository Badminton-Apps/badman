import { DatabaseModule } from '@badman/backend-database';
import { QueueModule } from '@badman/backend-queue';
import { Module } from '@nestjs/common';
import { RankingController, UploadRankingController } from './controllers';
import {
  CalculationService,
  PlaceService,
  PointsService,
  UpdateRankingService,
} from './services';

@Module({
  controllers: [UploadRankingController, RankingController],
  imports: [DatabaseModule, QueueModule],
  providers: [
    PointsService,
    CalculationService,
    PlaceService,
    UpdateRankingService,
  ],
  exports: [CalculationService, PointsService],
})
export class RankingModule {}
