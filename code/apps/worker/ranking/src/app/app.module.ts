import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { RankingConsumer } from './processors/ranking';

@Module({
  providers: [RankingConsumer],
  imports: [
    BullModule.registerQueue({
      name: 'ranking-queue',
      redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT, 10),
      },
    }),
  ],
})
export class RankingModule {}
