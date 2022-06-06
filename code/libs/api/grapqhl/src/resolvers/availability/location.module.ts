import { DatabaseModule } from '@badman/api/database';
import { Module } from '@nestjs/common';
import { LocationsResolver } from './location.resolver';

@Module({
  imports: [DatabaseModule],
  providers: [LocationsResolver],
})
export class LocationModule {}
