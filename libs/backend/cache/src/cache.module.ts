import { Module } from '@nestjs/common';
import { CacheStore, CacheModule as nestCache } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { redisStore } from 'cache-manager-redis-store';

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
            password: configService.get('REDIS_PASSWORD'),
            database: configService.get<number>('CACHE_DB') ?? 0,
          })) as unknown as CacheStore;

          return {
            store: redis,
            ttl: 60 * 60 * 24 * 7,
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
