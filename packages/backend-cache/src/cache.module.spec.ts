import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { ConfigModule } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import type { Cache } from "cache-manager";

import { CACHE_TTL, CacheModule } from "./cache.module";

describe("CacheModule", () => {
  describe("DB_CACHE=false (in-memory Keyv fallback)", () => {
    let moduleRef: TestingModule;
    let cache: Cache;

    beforeAll(async () => {
      moduleRef = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            ignoreEnvFile: true,
            isGlobal: true,
            load: [() => ({ DB_CACHE: false, NODE_ENV: "test" })],
          }),
          CacheModule,
        ],
      }).compile();

      // init() runs OnApplicationBootstrap → CacheHealthCheck does its own
      // round-trip. Throws here if the cache wiring is broken.
      await moduleRef.init();

      cache = moduleRef.get<Cache>(CACHE_MANAGER);
    });

    afterAll(async () => {
      await moduleRef.close();
    });

    it("exposes the cache-manager interface", () => {
      expect(typeof cache.set).toBe("function");
      expect(typeof cache.get).toBe("function");
      expect(typeof cache.del).toBe("function");
    });

    // Regression guard: when cache-manager v5 was installed but
    // @nestjs/cache-manager v3 expected v6, the whole `{stores, ttl}` config got
    // handed to `createCache` as the single `store`, and the very first
    // `.set()` blew up with `store.set is not a function`. Any future drift
    // back to that mismatch is caught here.
    it("performs a real set/get round-trip without throwing", async () => {
      await cache.set("regression:smoke", "ok", 1000);
      expect(await cache.get<string>("regression:smoke")).toBe("ok");
    });

    it("del removes the key", async () => {
      await cache.set("regression:remove", "value", 1000);
      await cache.del("regression:remove");
      expect(await cache.get("regression:remove")).toBeNull();
    });
  });

  it("CACHE_TTL is one week in milliseconds", () => {
    expect(CACHE_TTL).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
