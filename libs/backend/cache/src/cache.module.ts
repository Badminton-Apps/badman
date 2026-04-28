import { Inject, Injectable, Logger, Module, OnApplicationBootstrap } from "@nestjs/common";
import { CACHE_MANAGER, CacheModule as nestCache } from "@nestjs/cache-manager";
import { ConfigModule, ConfigService } from "@nestjs/config";

import type { Cache } from "cache-manager";
import KeyvRedis from "@keyv/redis";
import Keyv from "keyv";
import { ConfigType } from "@badman/utils";

export const CACHE_TTL = 60 * 60 * 24 * 7 * 1000; // 1 week in milliseconds

const logger = new Logger("CacheModule");

// Boot-time round-trip against the configured cache. Catches the
// `store.set is not a function` class of failure (cache-manager / Keyv API
// drift) at startup instead of on the first cached request.
@Injectable()
export class CacheHealthCheck implements OnApplicationBootstrap {
  private readonly logger = new Logger(CacheHealthCheck.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async onApplicationBootstrap(): Promise<void> {
    const key = `__cache_health_check__:${process.pid}`;
    const value = String(Date.now());
    try {
      await this.cache.set(key, value, 5_000);
      const got = await this.cache.get<string>(key);
      if (got !== value) {
        throw new Error(`cache round-trip mismatch: expected ${value}, got ${String(got)}`);
      }
      await this.cache.del(key);
      this.logger.log("Cache round-trip OK");
    } catch (err) {
      this.logger.error("Cache round-trip FAILED — refusing to start", err);
      throw err;
    }
  }
}

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
  providers: [CacheHealthCheck],
  exports: [nestCache],
})
export class CacheModule {}
