import { DatabaseModule } from '@badman/backend-database';
import { Module } from '@nestjs/common';
import { CronJobMetaResolver, CronJobResolver } from './cronJob.resolver';

@Module({
  imports: [DatabaseModule],
  providers: [CronJobResolver, CronJobMetaResolver],
})
export class CronJobResolverModule {}
