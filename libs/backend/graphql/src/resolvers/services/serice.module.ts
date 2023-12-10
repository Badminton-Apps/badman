import { DatabaseModule } from '@badman/backend-database';
import { Module } from '@nestjs/common';
import { ServiceResolver } from './service.resolver';

@Module({
  imports: [DatabaseModule],
  providers: [ServiceResolver],
})
export class ServiceResolverModule {}
