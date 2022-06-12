import { QueueModule } from '@badman/queue';
import { Module } from '@nestjs/common';
import { RankingConsumer } from './processors/ranking';

@Module({
  imports: [QueueModule],
  providers: [RankingConsumer],
})
export class RankingModule {}
