import { Logger, Module } from "@nestjs/common";
import { CacheStore, CacheModule as nestCache } from "@nestjs/cache-manager";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { redisStore } from "cache-manager-redis-store";
import { ConfigType } from "@badman/utils";

export const CACHE_TTL = 60 * 60 * 24 * 7; // 1 week

const logger = new Logger("CacheModule");

@Module({
  imports: [
    nestCache.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService<ConfigType>) => {
        if (configService.get<boolean>("DB_CACHE") === true) {
          const redis = (await redisStore({
            socket: {
              host: configService.get("REDIS_HOST"),
              port: configService.get<number>("REDIS_PORT"),
            },
            ttl: CACHE_TTL,
            password: configService.get("REDIS_PASSWORD"),
            database: configService.get<number>("REDIS_DATABASE") ?? 0,
          })) as unknown as CacheStore;

          logger.log(
            `Cache: Using Redis store at ${configService.get("REDIS_HOST")}:${configService.get("REDIS_PORT")}`
          );

          return {
            store: redis,
            ttl: CACHE_TTL,
          };
        } else {
          const env = configService.get<string>("NODE_ENV");
          if (env === "production" || env === "beta") {
            logger.warn(
              "Cache: Redis is NOT being used - using in-memory store. Set DB_CACHE=true for production to reduce memory pressure."
            );
          }
          return {
            ttl: 0,
            store: "memory",
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
