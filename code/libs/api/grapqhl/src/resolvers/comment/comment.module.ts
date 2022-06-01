import { DatabaseModule } from '@badman/api/database';
import { Module } from '@nestjs/common';
import { RankingResolver } from './comment.resolver';

@Module({
  imports: [DatabaseModule],
  providers: [RankingResolver],
})
export class CommentModule {}
