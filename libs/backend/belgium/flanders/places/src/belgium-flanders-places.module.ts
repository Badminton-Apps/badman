import { Module } from '@nestjs/common';
import { BelgiumFlandersPlacesService } from './services/belgium-flanders-places.service';

@Module({
  controllers: [],
  providers: [BelgiumFlandersPlacesService],
  exports: [BelgiumFlandersPlacesService],
})
export class BelgiumFlandersPlacesModule {}
