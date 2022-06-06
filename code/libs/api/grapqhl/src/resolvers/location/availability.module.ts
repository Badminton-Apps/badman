import { DatabaseModule } from '@badman/api/database';
import { Module } from '@nestjs/common';
import { AvailabilitysResolver } from './availability.resolver';

@Module({
  imports: [DatabaseModule],
  providers: [AvailabilitysResolver],
})
export class AvailabilityModule {}
