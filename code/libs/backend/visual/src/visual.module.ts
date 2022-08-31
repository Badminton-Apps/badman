import { ConfigModule, ConfigService } from '@nestjs/config';
import { VisualService } from './services';
//import CacheModule from '@neskjs/common/cache';
import { Module, CacheModule } from '@nestjs/common';

//import redisStore from 'cache-manager-redis-store';
import * as redisStore from 'cache-manager-redis-store';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return {
          store: redisStore,
          host: configService.get('REDIS_HOST'), //default host
          port: configService.get('REDIS_PORT'), //default port,
          password: configService.get('REDIS_PASSWORD'),
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
