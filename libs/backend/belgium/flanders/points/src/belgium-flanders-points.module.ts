import { Module } from '@nestjs/common';
import { BelgiumFlandersPointsService } from './services/belgium-flanders-points.service';

@Module({
  controllers: [],
  providers: [BelgiumFlandersPointsService],
  exports: [BelgiumFlandersPointsService],
})
export class BelgiumFlandersPointsModule {}
