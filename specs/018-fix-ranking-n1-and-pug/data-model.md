# Phase 1 Data Model — Fix RankingSystem N+1 + clubenrollment pug

**Branch**: `018-fix-ranking-n1-and-pug` | **Date**: 2026-05-18

No persistent schema changes. This document records the *in-memory* shape of the new cached accessor, the pre-existing entities it wraps, and the trust boundaries on the model instances it returns.

---

## Existing entities (unchanged on disk, behavior preserved)

### `RankingSystem` (Sequelize model, `ranking` schema)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `UUIDV4` | Primary key. |
| `primary` | `boolean` | Exactly one row should have `primary = true` (uniqueness enforced by the existing mutation logic at `rankingSystem.resolver.ts:154-170`). |
| `amountOfLevels` | `int` | Read by `getRankingProtected` in `Game.players` and `RankingPlace` paths. |
| `maxDiffLevels` | `int` | Read by `getRankingProtected` inside `rankingPlaces()` loop. |
| (remaining columns) | various | Pass-through; the cache returns the full Sequelize instance. |

The model itself is **not modified** by this feature.

### `RankingPlace`, `RankingLastPlace`

Reference `RankingSystem` by `systemId` (`belongsTo`). No schema change. The current `getRankingSystem()` association method is replaced at the resolver layer with a cached lookup but the model API stays the same for non-resolver callers (queue workers, calculation service).

### `Game`, `GamePlayerMembership`

`Game.players` resolver inspects `GamePlayerMembership.{single,double,mix}` and falls back to the primary `RankingSystem` when any are null. The fallback path is unchanged in semantics; only the *source* of the `RankingSystem` instance moves from a direct DB call to the cached accessor.

---

## New runtime entity

### `RankingSystemService` (Nest `@Injectable()`)

**Module**: `RankingModule` (existing, `libs/backend/ranking/src/ranking.module.ts`).
**Scope**: singleton (default Nest provider scope).
**Public surface**:

```ts
@Injectable()
export class RankingSystemService {
  async getPrimary(): Promise<RankingSystem | null>;
  async getById(id: string): Promise<RankingSystem | null>;
  invalidate(): void;
}
```

**Internal state**:

| Field | Type | Purpose |
|-------|------|---------|
| `primaryCache` | `{ value: RankingSystem \| null; expiresAt: number } \| null` | Memoized result of `findOne({ where: { primary: true } })`. |
| `byIdCache` | `Map<string, { value: RankingSystem; expiresAt: number }>` | Memoized `findByPk(id)` results. Stores only present rows; misses are NOT cached (to avoid poisoning if a referenced row appears later via seed/migration). |
| `TTL_MS` | `number` (constant) | `5 * 60 * 1000`. |

**Behavioral contract**:

1. `getPrimary()`
   - If `primaryCache` exists and `Date.now() < primaryCache.expiresAt`: return `primaryCache.value`.
   - Else: `await RankingSystem.findOne({ where: { primary: true } })`, store `{ value, expiresAt: Date.now() + TTL_MS }`, return the value.
   - Concurrent in-flight requests for the same key MUST share one DB call. (Implementation: store the in-flight `Promise` in the cache slot until it resolves, then replace with the materialized entry. See R-IM-001 below.)

2. `getById(id)`
   - If a non-expired entry for `id` exists in `byIdCache`: return it.
   - Else: `await RankingSystem.findByPk(id)`. If the row is found, store with `expiresAt: Date.now() + TTL_MS`. If `null`, do NOT cache. Return the result regardless.
   - Same in-flight de-duplication as `getPrimary()`.

3. `invalidate()`
   - Set `primaryCache = null`.
   - `byIdCache.clear()`.
   - Synchronous, no `await`.

**Trust boundary on returned instances**:

The service returns the *same Sequelize model instance* on cache hits. Callers MUST treat the result as read-only. The three affected resolvers only read attributes; they do not call setters or `save()` on the cached system. This contract is documented in the service's TSDoc and in Spec Assumption 4.

If a caller needs to mutate, it MUST fetch directly from the model (this is what the `RankingSystem` mutation resolver continues to do — it never goes through the cache for the write path).

---

## State transitions

```
                    ┌─────────────┐
                    │   EMPTY     │  initial
                    └──────┬──────┘
                           │ getPrimary/getById (miss)
                           ▼
                    ┌─────────────┐
              ┌────►│  IN-FLIGHT  │  promise pending
              │     └──────┬──────┘
              │            │ DB resolves
              │            ▼
              │     ┌─────────────┐
              │     │   FRESH     │  expiresAt > now
              │     └──────┬──────┘
              │            │ Date.now() >= expiresAt
              │            ▼
              │     ┌─────────────┐
              └─────│   STALE     │  next read triggers IN-FLIGHT
                    └─────────────┘
                           ▲
                           │ invalidate()
                           │ resets to EMPTY synchronously
```

`invalidate()` collapses any state back to `EMPTY`. An in-flight promise mid-execution is allowed to complete and write its result to a now-EMPTY slot; the next read after that write will see fresh data, which is the correct behavior post-mutation (the mutation already committed before `invalidate()` ran).

---

## Implementation rule references (not new code, recorded here for traceability)

- **R-IM-001** Concurrent de-duplication: a coalescing pattern, e.g. `if (this.inflightPrimary) return this.inflightPrimary; this.inflightPrimary = (async () => { ... })(); ...`. Required to prevent thundering-herd at process start.
- **R-IM-002** Constructor injection: `lastRankingPlace.resolver.ts` currently has no constructor. Add one accepting `private readonly rankingSystemService: RankingSystemService`. `rankingPlace.resolver.ts` keeps its existing `Sequelize` injection and adds the new one.
- **R-IM-003** Invalidation placement: inside each mutation in `rankingSystem.resolver.ts`, call `this.rankingSystemService.invalidate()` after `await transaction.commit()` succeeds (i.e. in the try block, after commit, before returning). Do NOT call from inside the `catch` block.

---

## Out-of-scope (no changes)

- No new tables, columns, indexes.
- No GraphQL schema additions or modifications.
- No changes to `RankingPlace` / `RankingLastPlace` / `Game` model definitions.
- No changes to background workers (sync, ranking calculation).
- No invalidation on non-resolver writes (migrations, manual SQL, direct queue jobs). The 5-min TTL is the safety net for these paths.
