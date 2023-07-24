import { DatabaseModule } from '@badman/backend-database';
import { NotificationsModule } from '@badman/backend-notifications';
import { Module } from '@nestjs/common';
import { CommentResolver } from './comment.resolver';

@Module({
  imports: [NotificationsModule, DatabaseModule],
  providers: [CommentResolver],
})
export class CommentResolverModule {}
