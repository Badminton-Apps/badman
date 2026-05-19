# Contract: `RankingSystemService`

**Module**: `@badman/backend-ranking`
**Class**: `RankingSystemService`
**Lifecycle**: Nest singleton provider (default scope).
**Branch**: `018-fix-ranking-n1-and-pug`

This is the only new public surface introduced by this feature. It is internal to the backend (no GraphQL operation, no REST endpoint). The "contract" therefore describes the TypeScript surface, its observable behavior, and the invariants that consumers may rely on.

---

## Public surface (TypeScript)

```ts
import { RankingSystem } from "@badman/backend-database";

export declare class RankingSystemService {
  /**
   * Returns the row where primary=true, or null if none exists.
   * Memoized for up to 5 minutes per process. Concurrent callers share one DB round trip.
   */
  getPrimary(): Promise<RankingSystem | null>;

  /**
   * Returns the row with the given id, or null if not found.
   * Memoized for up to 5 minutes per process. Misses are NOT cached.
   */
  getById(id: string): Promise<RankingSystem | null>;

  /**
   * Drops every cached entry synchronously.
   * MUST be called by RankingSystem create/update/delete mutations after commit.
   */
  invalidate(): void;
}
```

---

## Behavioral contract

### `getPrimary()`

| Aspect | Guarantee |
|--------|-----------|
| Return type | `Promise<RankingSystem \| null>`. `null` iff the database has no row with `primary = true`. |
| Identity | Returns the same Sequelize model instance for the lifetime of a cache entry. Callers MUST treat it as read-only. |
| Freshness | At most 5 minutes stale from the time the entry was written into the cache. |
| Database queries on miss | Exactly one `findOne({ where: { primary: true } })`, regardless of how many callers awaited simultaneously. |
| Database queries on hit | Zero. |
| Concurrency | If `getPrimary()` is invoked N times in parallel before the first DB call resolves, exactly one DB call is issued and all N callers receive its result. |
| Failure mode | If the DB call rejects, the cache slot is left empty (no negative caching). The promise rejects to the caller as-is. |

### `getById(id)`

| Aspect | Guarantee |
|--------|-----------|
| Return type | `Promise<RankingSystem \| null>`. `null` iff no row with that primary key exists. |
| Identity | Same instance returned for cache hits. Read-only. |
| Freshness | At most 5 minutes stale. |
| Database queries on miss | Exactly one `findByPk(id)`. |
| Database queries on hit | Zero. |
| Misses (row not found) | NOT cached. A subsequent call for the same id will re-query. Rationale: prevents a transient missing reference (e.g. mid-migration) from poisoning the cache for the TTL. |
| Concurrency | Same in-flight de-duplication as `getPrimary()`, per id. |
| Failure mode | Same as `getPrimary()`. |

### `invalidate()`

| Aspect | Guarantee |
|--------|-----------|
| Return type | `void`. Synchronous. |
| Effect | Subsequent calls to `getPrimary()` / `getById(*)` will re-query the database on their first invocation. |
| In-flight promises | Allowed to complete; their results are written into the now-empty slots and become the next "fresh" cache state. This is correct because by the time `invalidate()` is called the underlying mutation has already committed. |
| Idempotent | Calling it twice in a row is a no-op the second time. |

---

## Consumer contract

The service MUST be consumed via constructor injection in NestJS providers / resolvers:

```ts
constructor(private readonly rankingSystemService: RankingSystemService) {}
```

Consumers MUST NOT:
- Mutate the returned `RankingSystem` instance.
- Persist a reference to the returned instance beyond a single request scope and expect it to track DB changes (the cache may refresh underneath).
- Bypass the service by calling `RankingSystem.findOne / findByPk` for the same lookups in the migrated resolvers — defeats the cache.

Consumers MAY:
- Call `getPrimary()` or `getById()` from any async path (resolver, queue processor, service).
- Pass the resulting instance through to helpers that read attributes (e.g. `getRankingProtected`).

---

## Migration-only consumers (this feature)

The following resolvers are migrated to use the service in this feature; together they satisfy Spec FR-003 through FR-006:

| File | Line(s) | Replaces |
|------|---------|----------|
| `libs/backend/graphql/src/resolvers/game/game.resolver.ts` | 102–107 | `RankingSystem.findOne({ where: { primary: true } })` → `getPrimary()` |
| `libs/backend/graphql/src/resolvers/ranking/rankingPlace.resolver.ts` | 31 | `RankingSystem.findByPk(place.systemId, { attributes: ["amountOfLevels"] })` → `getById(place.systemId)` |
| `libs/backend/graphql/src/resolvers/ranking/rankingPlace.resolver.ts` | 52 | `RankingSystem.findByPk(place.systemId, { attributes: ["amountOfLevels", "maxDiffLevels"] })` → `getById(place.systemId)` |
| `libs/backend/graphql/src/resolvers/ranking/rankingPlace.resolver.ts` | 67–70 | `rankingPlace.getRankingSystem()` → `getById(rankingPlace.systemId)` |
| `libs/backend/graphql/src/resolvers/ranking/lastRankingPlace.resolver.ts` | 42–45 | `rankingPlace.getRankingSystem()` → `getById(rankingPlace.systemId)` |

Note on attribute projection: the old `findByPk` calls at lines 31 and 52 pass `attributes: [...]` to limit columns. The cached accessor always loads the full row. This is acceptable because the table is wide-but-tiny and the cache amortizes the read across many requests; the optimization that the original attribute list represented is now obsolete.

---

## Invalidation consumers (this feature)

| File | Where to call `invalidate()` |
|------|------------------------------|
| `libs/backend/graphql/src/resolvers/ranking/rankingSystem.resolver.ts` | Inside each of the 7 mutations on this resolver, immediately after `await transaction.commit()` succeeds. Implementations are in lines 84, 136, 212, 252, 292, 371 (returning `RankingSystem`) and 420 (returning `Boolean`). |

The call site MUST be `this.rankingSystemService.invalidate();` (constructor-injected). It MUST NOT be in `catch` blocks.

---

## Observability

Per Spec FR-013, the service MUST log exactly:
- `Logger.debug` on `getPrimary()` miss — message includes a stable token (e.g. `"RankingSystemService: getPrimary miss"`).
- `Logger.debug` on `getById(id)` miss — message includes the id.
- `Logger.debug` on `invalidate()` — single message per call.

Cache hits MUST NOT be logged (avoids production noise on hot paths). No metrics counter, no hit-ratio API, no health endpoint are in scope. Production verification of cache effectiveness relies on Sentry N+1 alerts no longer firing and on APM response-time deltas (Spec SC-001, SC-002, SC-003, SC-006).

## Versioning

This is a new internal service. No prior version. Future changes:
- Adding more accessors (e.g. `getAllSystems()`): MINOR.
- Changing the TTL constant: PATCH.
- Removing or renaming `getPrimary` / `getById` / `invalidate`: MAJOR (would require a coordinated PR updating all call sites).
