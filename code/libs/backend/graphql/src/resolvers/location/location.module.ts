import { DatabaseModule } from '@badman/backend/database';
import { Module } from '@nestjs/common';
import { LocationResolver } from './location.resolver';

@Module({
  imports: [DatabaseModule],
  providers: [LocationResolver],
})
export class LocationResolverModule {}
