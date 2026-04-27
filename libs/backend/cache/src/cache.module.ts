import { Logger, Module } from "@nestjs/common";
import { CacheModule as nestCache } from "@nestjs/cache-manager";
import { ConfigModule, ConfigService } from "@nestjs/config";

import KeyvRedis from "@keyv/redis";
import Keyv from "keyv";
import { ConfigType } from "@badman/utils";

export const CACHE_TTL = 60 * 60 * 24 * 7 * 1000; // 1 week in milliseconds

const logger = new Logger("CacheModule");

@Module({
  imports: [
    nestCache.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService<ConfigType>) => {
        if (configService.get<boolean>("DB_CACHE") === true) {
          const host = configService.get("REDIS_HOST");
          const port = configService.get<number>("REDIS_PORT");
          const password = configService.get("REDIS_PASSWORD");
          const database = configService.get<number>("REDIS_DATABASE") ?? 0;

          let redisUrl = password ? `redis://:${password}@` : "redis://";
          redisUrl += `${host}:${port}/${database}`;

          logger.log(`Cache: Using Redis store at ${host}:${port}`);

          return {
            stores: [new Keyv({ store: new KeyvRedis(redisUrl) })],
            ttl: CACHE_TTL,
          };
        } else {
          const env = configService.get<string>("NODE_ENV");
          // "beta" was renamed to "staging"; consider removing "beta" later.
          if (env === "production" || env === "staging" || env === "beta") {
            logger.warn(
              "Cache: Redis is NOT being used - using in-memory store. Set DB_CACHE=true for production to reduce memory pressure."
            );
          }
          return {
            stores: [new Keyv()],
            ttl: 0,
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
