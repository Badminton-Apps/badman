import { DatabaseModule } from "@badman/backend-database";
import { QueueModule } from "@badman/backend-queue";
import { Module } from "@nestjs/common";
import { RankingController, UploadRankingController } from "./controllers";
import {
  CalculationService,
  PlaceService,
  PointsService,
  RankingSystemService,
  UpdateRankingService,
} from "./services";
import { BelgiumFlandersPlacesModule } from "@badman/belgium-flanders-places";
import { BelgiumFlandersPointsModule } from "@badman/belgium-flanders-points";
import { ConfigModule } from "@nestjs/config";

@Module({
  controllers: [UploadRankingController, RankingController],
  imports: [
    DatabaseModule,
    QueueModule,
    BelgiumFlandersPlacesModule,
    BelgiumFlandersPointsModule,
    ConfigModule,
  ],
  providers: [
    PointsService,
    CalculationService,
    PlaceService,
    RankingSystemService,
    UpdateRankingService,
  ],
  exports: [CalculationService, PointsService, PlaceService, RankingSystemService],
})
export class RankingModule {}
