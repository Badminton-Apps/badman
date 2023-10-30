import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { Badminton, RankingQueue, SimulationQueue, SyncQueue } from './queues';

const BullQueueModules = [
  BullModule.registerQueue({ name: RankingQueue }),
  BullModule.registerQueue({ name: SyncQueue }),
  BullModule.registerQueue({ name: SimulationQueue }),

  // Belgium
  BullModule.registerQueue({ name: Badminton.Belgium.Flanders.Points }),
  BullModule.registerQueue({ name: Badminton.Belgium.Flanders.Places }),
];

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        return {
          redis: {
            host: configService.get('REDIS_HOST'),
            port: configService.get<number>('REDIS_PORT') ?? 6379,
            password: configService.get('REDIS_PASSWORD'),
            db: configService.get<number>('QUEUE_DB') ?? 0,
          },
        };
      },
      inject: [ConfigService],
    }),
    ...BullQueueModules,
  ],
  exports: BullQueueModules,
})
export class QueueModule {}
