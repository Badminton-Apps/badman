import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { RankingQueue, SimulationQueue, SyncQueue } from './queues';

const BullQueueModules = [
  BullModule.registerQueue({ name: RankingQueue }),
  BullModule.registerQueue({ name: SyncQueue }),
  BullModule.registerQueue({ name: SimulationQueue }),
];

BullModule.registerQueueAsync;
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST'),
          port: +configService.get('REDIS_PORT'),
        },
      }),
      inject: [ConfigService],
    }),
    ...BullQueueModules,
  ],
  exports: BullQueueModules,
})
export class QueueModule {}
