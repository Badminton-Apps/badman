import { DatabaseModule } from '@badman/api/database';
import { Module } from '@nestjs/common';
import { CommentResolver } from './comment.resolver';

@Module({
  imports: [DatabaseModule],
  providers: [CommentResolver],
})
export class CommentModule {}
