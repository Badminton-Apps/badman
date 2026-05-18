import { RankingSystem } from "@badman/backend-database";
import { Injectable, Logger } from "@nestjs/common";

type CacheEntry<T> = { value: T; expiresAt: number };

const TTL_MS = 5 * 60 * 1000;

@Injectable()
export class RankingSystemService {
  private readonly logger = new Logger(RankingSystemService.name);

  private primaryCache: CacheEntry<RankingSystem | null> | null = null;
  private primaryInflight: Promise<RankingSystem | null> | null = null;

  private readonly byIdCache = new Map<string, CacheEntry<RankingSystem>>();
  private readonly byIdInflight = new Map<string, Promise<RankingSystem | null>>();

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
