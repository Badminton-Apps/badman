import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { RankingConsumer } from './processors/ranking';
import { QueueModule } from '@badman/queue';

@Module({
  imports: [QueueModule],
  providers: [RankingConsumer],
})
export class RankingModule {}
