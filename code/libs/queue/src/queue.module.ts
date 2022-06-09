import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';

export const RankingQueue = 'ranking';
export const SyncQueue = 'sync';

const BullQueueModules = [
  BullModule.forRootAsync({
    imports: [ConfigModule],
    useFactory: async (configService: ConfigService) => ({
      name: RankingQueue,
      redis: {
        host: configService.get('REDIS_HOST'),
        port: +configService.get('REDIS_PORT'),
      },
    }),
    inject: [ConfigService],
  }),
  BullModule.forRootAsync({
    imports: [ConfigModule],
    useFactory: async (configService: ConfigService) => ({
      name: SyncQueue,
      redis: {
        host: configService.get('REDIS_HOST'),
        port: +configService.get('REDIS_PORT'),
      },
    }),
    inject: [ConfigService],
  }),
];

@Module({
  imports: BullQueueModules,
  exports: BullQueueModules,
})
export class QueueModule {}
