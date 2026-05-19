# Research: DataLoader for RankingPoint.player field resolver

## Decision: Introduce shared PlayerLoaderService in libs/backend/graphql/src/loaders/

**Decision**: Create `PlayerLoaderService` (Scope.REQUEST) in a new `loaders/` directory under `libs/backend/graphql/src/`. Export from the graphql module so features 022, 023, and 026 share one class.

**Rationale**: Three resolvers need per-request Player batching (RankingPoint, RankingLastPlace, Comment). One shared service prevents three separate DataLoader classes with identical batch fns. NestJS REQUEST scope ensures each request gets one shared instance across all resolvers that inject it.

**Alternatives considered**:
- Inline DataLoader in each resolver: rejected — duplicates batch fn; can't share within one request if different class instances
- PlayerLoaderService in `@badman/backend-ranking` or `@badman/backend-database`: rejected — those libs don't have the graphql layer knowledge; `libs/backend/graphql` is the correct home

## Decision: Batch fn uses Player.findAll with Op.in

**Decision**: `Player.findAll({ where: { id: { [Op.in]: keys } } })` returning `(Player | null)[]` in input-key order.

**Rationale**: Single query, returns all requested players in one round-trip. Map by id for O(1) key-to-result lookup. Missing ids → `null`.

## Decision: Pre-condition gate applies

**Decision**: Implementation blocked until Sentry N+1 alert on `RankingPoint.player` OR documented hot-path manual test result.

**Rationale**: Spec 019 stated this explicitly. Without a confirmed signal, this is speculative batching of a path that may never be hot enough to justify.
