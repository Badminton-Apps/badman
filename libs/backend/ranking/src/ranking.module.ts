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
import { BelgiumFlandersPlacesModule } from '@badman/belgium-flanders-places';
import { BelgiumFlandersPointsModule } from '@badman/belgium-flanders-points';

@Module({
  controllers: [UploadRankingController, RankingController],
  imports: [
    DatabaseModule,
    QueueModule,
    BelgiumFlandersPlacesModule,
    BelgiumFlandersPointsModule,
  ],
  providers: [
    PointsService,
    CalculationService,
    PlaceService,
    UpdateRankingService,
  ],
  exports: [CalculationService, PointsService, PlaceService],
})
export class RankingModule {}
