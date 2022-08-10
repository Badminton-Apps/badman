import { DatabaseModule } from '@badman/backend/database';
import { Module } from '@nestjs/common';
import { AvailabilitysResolver } from './availability.resolver';

@Module({
  imports: [DatabaseModule],
  providers: [AvailabilitysResolver],
})
export class AvailabilityModule {}
