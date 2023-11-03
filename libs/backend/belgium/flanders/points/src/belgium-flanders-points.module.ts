import { Module } from '@nestjs/common';
import { BelgiumFlandersPointsService } from './services/belgium-flanders-points.service';
import { DatabaseModule } from '@badman/backend-database';

@Module({
  controllers: [],
  imports: [DatabaseModule],
  providers: [BelgiumFlandersPointsService],
  exports: [BelgiumFlandersPointsService],
})
export class BelgiumFlandersPointsModule {}
