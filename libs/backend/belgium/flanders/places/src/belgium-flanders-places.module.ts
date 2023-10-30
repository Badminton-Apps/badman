import { Module } from '@nestjs/common';
import { BelgiumFlandersPlacesService } from './services/belgium-flanders-places.service';
import { DatabaseModule } from '@badman/backend-database';

@Module({
  controllers: [],
  imports: [DatabaseModule],
  providers: [BelgiumFlandersPlacesService],
  exports: [BelgiumFlandersPlacesService],
})
export class BelgiumFlandersPlacesModule {}
