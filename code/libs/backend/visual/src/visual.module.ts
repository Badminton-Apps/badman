import { ConfigModule, ConfigService } from '@nestjs/config';
import { VisualService } from './services';
import { Module, CacheModule } from '@nestjs/common';
import { CacheStore } from '@nestjs/common/cache/interfaces/cache-manager.interface';

import { redisStore } from 'cache-manager-redis-store';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const store = await redisStore({
          socket: {
            host: configService.get('REDIS_HOST'),
            port: +configService.get('REDIS_PORT'),
          },
          password: configService.get('REDIS_PASSWORD'),
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
