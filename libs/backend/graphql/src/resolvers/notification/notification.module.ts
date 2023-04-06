import { DatabaseModule } from '@badman/backend-database';
import { Module } from '@nestjs/common';
import { NotificationResolver } from './notification.resolver';

@Module({
  imports: [DatabaseModule],
  providers: [NotificationResolver],
})
export class NotificationResolverModule {}
