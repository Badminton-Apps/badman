import { Module } from '@nestjs/common';
import { CacheStore, CacheModule as nestCache } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { redisStore } from 'cache-manager-redis-store';

export const CACHE_TTL = 60 * 60 * 24 * 7; // 1 week

@Module({
  imports: [
    nestCache.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        if (configService.get('DB_CACHE') === 'true') {
          const redis = (await redisStore({
            socket: {
              host: configService.get('REDIS_HOST'),
              port: configService.get<number>('REDIS_PORT'),
            },
            ttl: CACHE_TTL,
            password: configService.get('REDIS_PASSWORD'),
            database: configService.get<number>('REDIS_DATABASE') ?? 0,
          })) as unknown as CacheStore;

          return {
            store: redis,
            ttl: CACHE_TTL,
          };
        } else {
          return {
            ttl: 0,
            store: 'memory',
          };
        }
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [],
  providers: [],
  exports: [nestCache],
})
export class CacheModule {}
