import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { RankingConsumer } from './processors/ranking';

@Module({
  providers: [RankingConsumer],
  imports: [
    BullModule.registerQueue({
      name: 'ranking-queue',
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),
  ],
})
export class RankingModule {}
