# Data Model: DataLoader for RankingSystemService per-request dedup

## No New Persistent Entities

This feature introduces no new Sequelize models, database migrations, or GraphQL object types. All changes are confined to the service layer (in-memory, per-request).

## New Service: RankingSystemLoaderService

**Location**: `libs/backend/ranking/src/services/system/ranking-system-loader.service.ts`

**Scope**: `Scope.REQUEST` (NestJS DI)

**Owns**: One `DataLoader<string, RankingSystem | null>` instance, created at construction time.

**Dependencies**:
- `RankingSystemService` (module-scoped, injected via NestJS DI)

**Public API**:
```typescript
load(id: string | null | undefined): Promise<RankingSystem | null>
```
- If `id` is falsy: returns `Promise.resolve(null)` immediately (no batch dispatch)
- Otherwise: delegates to `DataLoader.load(id)` which batches within the current microtask tick

**Batch function signature** (internal):
```typescript
async (keys: readonly string[]): Promise<(RankingSystem | null)[]>
```
- Calls `Promise.all(keys.map(id => rankingSystemService.getById(id)))`
- Returns results in key order (DataLoader contract satisfied because `getById` returns null for missing ids)

## Affected Resolver Injection Points

| Resolver | Field/Method | Change |
|----------|-------------|--------|
| `lastRankingPlace.resolver.ts` | `rankingSystem` field | `getById(id)` → `loaderService.load(id)` |
| `rankingPoint.resolver.ts` | `system` field | `getById(id)` → `loaderService.load(id)` |
| `rankingSystemGroup.resolver.ts` | various | `getById(id)` → `loaderService.load(id)` |
| `assembly.resolver.ts` | `titularsPlayers`, `baseTeamPlayers` | `getById(id)` → `loaderService.load(id)` |
| `subevent.resolver.ts` | recalculate mutation | `getById(id)` → `loaderService.load(id)` |
| `encounter.resolver.ts` | recalculate mutation | `getById(id)` → `loaderService.load(id)` |
| remaining 10 call sites | various | `getById(id)` → `loaderService.load(id)` |

## Module Wiring

`RankingModule` (in `libs/backend/ranking/src/ranking.module.ts`):
- Add `RankingSystemLoaderService` to `providers: [...]`
- Add `RankingSystemLoaderService` to `exports: [...]`
- No new module imports needed
