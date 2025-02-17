import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { Badminton, RankingQueue, SyncQueue } from './queues';
import { ConfigType } from '@badman/utils';
import { TransactionManager } from './services';

const BullQueueModules = [
  BullModule.registerQueue({ name: RankingQueue }),
  BullModule.registerQueue({ name: SyncQueue }),

  // Belgium
  BullModule.registerQueue({ name: Badminton.Belgium.Flanders.Points }),
  BullModule.registerQueue({ name: Badminton.Belgium.Flanders.Places }),
];

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService<ConfigType>) => {
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
  providers: [TransactionManager],
  exports: [
    TransactionManager,
    ...BullQueueModules,
  ],
})
export class QueueModule {}
