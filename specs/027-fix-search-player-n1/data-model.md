# Phase 1 — Data Model

No database schema change. No migration. No new GraphQL type. This document inventories the existing entities the feature touches and pins down the exact access pattern the new helper relies on, so reviewers and the `/speckit.tasks` step have an unambiguous reference.

## Entities involved (no changes)

### `Player` — table `players` (schema `public`)

- **Source**: [libs/backend/database/src/models/player.model.ts](../../libs/backend/database/src/models/player.model.ts)
- **Relevant attributes**: `id` (UUID, PK), `firstName`, `lastName`, `memberId`, `gender`, `slug`, `fullName` (virtual getter — no DB call).
- **Relevant association**: `@HasMany(() => RankingLastPlace, 'playerId')` (line 152). The generated `getRankingLastPlaces` mixin (line 269) is the call site this feature replaces in the resolver body.
- **Filters applied by the `players` query** (unchanged): `memberId IS NOT NULL`, `memberId != ''`, `memberId NOT ILIKE '%unknown%'` (`getPlayerFilters()` in [player.resolver.ts](../../libs/backend/graphql/src/resolvers/player/player.resolver.ts)).
- **New constraint introduced by this feature**: server-side `LIMIT` clamping per FR-001..003 (default 25, max 200). Implementation-level only; not a database constraint.

### `RankingLastPlace` — table `ranking_last_places` (schema `ranking`)

- **Source**: [libs/backend/database/src/models/ranking/ranking-last-place.model.ts](../../libs/backend/database/src/models/ranking/ranking-last-place.model.ts)
- **Relevant attributes**: `id` (UUID, PK), `playerId` (FK → `players.id`), `systemId` (FK → `ranking_systems.id`), `single` (Int), `double` (Int), `mix` (Int), `rankingDate` (Date), `gender`, plus the standard `createdAt` / `updatedAt`.
- **Relevant indexes**:
  - `lastPlaces_ranking_index` — composite on `(playerId, systemId)` ([ranking-last-place.model.ts:128-140](../../libs/backend/database/src/models/ranking/ranking-last-place.model.ts#L128-L140)).
  - `(playerId, systemId)` is also covered by the composite `unique_constraint` defined via `@Unique` on each column.
- **Access pattern introduced by this feature** (covered by the existing composite index):
  ```sql
  SELECT *
    FROM ranking.ranking_last_places
   WHERE "playerId" IN ($1, $2, …, $N)
     AND "systemId" = $primary_id
   ORDER BY "rankingDate" DESC;
  ```
  `N ≤ PLAYERS_MAX_TAKE = 200`. With the composite index, this is a single index scan per request.

### `RankingSystem` — table `ranking_systems` (schema `ranking`)

- **Source**: [libs/backend/database/src/models/ranking/ranking-system.model.ts](../../libs/backend/database/src/models/ranking/ranking-system.model.ts)
- **Relevant attributes**: `id` (UUID, PK), `primary` (bool).
- **Access**: only via [RankingSystemService](../../libs/backend/ranking/src/services/system/ranking-system.service.ts) (`getPrimary`, `getById`). 5-min TTL cache with in-flight dedup. No direct `RankingSystem.findOne` / `findAll` calls from the player resolver path after this feature lands.

## New runtime entity (not persistent)

### `PlayerAssociationService`

A request-scoped GraphQL helper. Lives at `libs/backend/graphql/src/resolvers/player/player-association.service.ts`.

- **Lifecycle**: `@Injectable({ scope: Scope.REQUEST })` — instantiated per HTTP request and discarded with the request. No cross-request state.
- **Owned state**: one `DataLoader<string, RankingLastPlace[]>` instance, keyed by `playerId`, valid only for the lifetime of this service instance.
- **Dependencies**: constructor-injects `RankingSystemService` (module-scoped, cached). No direct DB injection; uses `RankingLastPlace.findAll` as a Sequelize model static.
- **Public surface** (one method):
  ```ts
  getPrimaryRankingLastPlaces(player: Player): Promise<RankingLastPlace[]>;
  ```
  Internally calls `loader.load(player.id)`. Returns `[]` immediately if `player.id` is falsy.
- **Batch function semantics**:
  - **Input**: `readonly string[]` of unique-by-dataloader `playerId` values requested within a single microtask tick.
  - **Behaviour**:
    1. `await rankingSystemService.getPrimary()`. If `null`, short-circuit: return `keys.map(() => [])` (FR-011).
    2. `RankingLastPlace.findAll({ where: { playerId: { [Op.in]: [...keys] }, systemId: primary.id }, order: [['rankingDate', 'DESC']] })`.
    3. Group rows by `playerId` into a `Map<string, RankingLastPlace[]>`.
    4. Return `keys.map(id => grouped.get(id) ?? [])` — same length, same order as `keys`, per the DataLoader contract.
  - **Output**: `Promise<RankingLastPlace[][]>` where index `i` is the rows for `keys[i]`.

## State / lifecycle diagrams

No state machine here — the helper is stateless once constructed. The DataLoader internally maintains a per-instance memo cache that lives exactly as long as the request.

## Validation rules (unchanged)

- `players` query: `take` is `@Min(1)` via existing class-validator decoration on `ListArgs.take` (see [list.args.ts](../../libs/backend/graphql/src/utils/list.args.ts)). The new server-side cap is applied *after* validation succeeds and clamps the effective limit; it never throws.
- `skip` semantics: unchanged.
- `where`: unchanged. The new feature does not alter filter handling.
