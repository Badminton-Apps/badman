import { ConfigModule, ConfigService } from '@nestjs/config';
import { VisualService } from './services';
import { Module, CacheModule } from '@nestjs/common';
import { CacheStore } from '@nestjs/common/cache/interfaces/cache-manager.interface';

import { redisStore } from 'cache-manager-redis-store';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => {
        const store = await redisStore({
          socket: {
            host: config.get('REDIS_HOST'),
            port: +config.get('REDIS_PORT'),
            passphrase: config.get('REDIS_PASSWORD'),
          },
        });

        return {
          store: store as unknown as CacheStore,
          ttl: 60 * 60 * 24 * 7,
        };
      },
      inject: [ConfigService],
    }),
    ConfigModule,
  ],
  providers: [VisualService],
  exports: [VisualService],
})
export class VisualModule {}
