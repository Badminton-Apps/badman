import { RankingSystem } from "@badman/backend-database";
import { Injectable, Logger } from "@nestjs/common";

type CacheEntry<T> = { value: T; expiresAt: number };

const TTL_MS = 5 * 60 * 1000;

/**
 * Cached accessor for RankingSystem rows.
 *
 * Cache stores the FULL row by design. The table has ~30 small columns and
 * single-digit row cardinality org-wide, so memory cost is negligible.
 * Keying the cache by (id, attributesSubset) would defeat cross-consumer
 * sharing for the same id and is intentionally not supported. If a caller
 * needs a different projection or strictly fresh data, call
 * `RankingSystem.findByPk` / `findOne` directly.
 */
@Injectable()
export class RankingSystemService {
  private readonly logger = new Logger(RankingSystemService.name);

  private primaryCache: CacheEntry<RankingSystem | null> | null = null;
  private primaryInflight: Promise<RankingSystem | null> | null = null;

  private readonly byIdCache = new Map<string, CacheEntry<RankingSystem>>();
  private readonly byIdInflight = new Map<string, Promise<RankingSystem | null>>();

  /**
   * Returns the row with primary=true, or null if none exists.
   * Memoized up to TTL_MS. Concurrent callers share one DB round trip.
   * Returns the full row (see class JSDoc).
   */
  async getPrimary(): Promise<RankingSystem | null> {
    const now = Date.now();
    if (this.primaryCache && now < this.primaryCache.expiresAt) {
      return this.primaryCache.value;
    }
    if (this.primaryInflight) {
      return this.primaryInflight;
    }

    this.logger.debug("RankingSystemService: getPrimary miss");

    this.primaryInflight = (async () => {
      try {
        const value = await RankingSystem.findOne({ where: { primary: true } });
        this.primaryCache = { value, expiresAt: Date.now() + TTL_MS };
        return value;
      } finally {
        this.primaryInflight = null;
      }
    })();

    return this.primaryInflight;
  }

  /**
   * Returns the row with the given id, or null if not found / id is falsy.
   * Memoized up to TTL_MS. Misses (not-found) are NOT cached.
   * Returns the full row (see class JSDoc).
   */
  async getById(id: string | null | undefined): Promise<RankingSystem | null> {
    if (!id) {
      return null;
    }
    const now = Date.now();
    const cached = this.byIdCache.get(id);
    if (cached && now < cached.expiresAt) {
      return cached.value;
    }
    const inflight = this.byIdInflight.get(id);
    if (inflight) {
      return inflight;
    }

    this.logger.debug(`RankingSystemService: getById miss (${id})`);

    const promise = (async () => {
      try {
        const value = await RankingSystem.findByPk(id);
        if (value) {
          this.byIdCache.set(id, { value, expiresAt: Date.now() + TTL_MS });
        }
        return value;
      } finally {
        this.byIdInflight.delete(id);
      }
    })();

    this.byIdInflight.set(id, promise);
    return promise;
  }

  invalidate(): void {
    this.logger.debug("RankingSystemService: invalidate");
    this.primaryCache = null;
    this.byIdCache.clear();
  }
}
