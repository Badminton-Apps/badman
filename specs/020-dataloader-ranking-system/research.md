# Research: DataLoader for RankingSystemService per-request dedup

## Decision: NestJS REQUEST scope for DataLoader owner

**Decision**: Use `@Injectable({ scope: Scope.REQUEST })` on `RankingSystemLoaderService`.

**Rationale**: NestJS REQUEST scope creates a new service instance per incoming HTTP/GraphQL request and destroys it after the response. This matches DataLoader's expected lifecycle — one DataLoader instance per request, batching all loads within that request's microtask ticks, then discarded. No manual cleanup needed.

**Alternatives considered**:
- Apollo context injection: rejected (FR-007 explicitly forbids Apollo context dependency; NestJS DI is already the lifecycle binding used by `TeamAssociationService`)
- Transient scope: rejected (creates a new instance per injection point, defeating shared batching)
- Module scope with manual per-request state: rejected (complex, error-prone, leaks state)

## Decision: DataLoader cache: true (default)

**Decision**: Keep DataLoader's default `cache: true` setting.

**Rationale**: Within a single request, if the same `systemId` is requested twice in separate ticks (e.g., first in `rankingSystem` field resolver, then in a subsequent resolver), the DataLoader cache returns the memoized result without re-batching. Since `RankingSystemService.getById` is already idempotent and TTL-cached at the service level, per-request memoization is safe and desirable.

**Alternatives considered**:
- `cache: false`: would re-batch on each tick even for the same key — unnecessary round-trips to `getById` even though results are identical

## Decision: Batch fn delegates to RankingSystemService.getById

**Decision**: Batch fn calls `Promise.all(keys.map(id => this.rankingSystemService.getById(id)))`.

**Rationale**: `getById` already handles: (a) TTL cache hits returning instantly, (b) inflight dedup for concurrent DB calls, (c) null for invalid/missing ids. The DataLoader batch fn does not need to re-implement any of this logic.

**Key behaviour confirmed**: `getById` does NOT cache null/not-found results (code: `if (value) { this.byIdCache.set(...) }`). The DataLoader's own per-request cache will memoize the null for that request only.

## Decision: Shared loader across all 16 call sites via module export

**Decision**: Export `RankingSystemLoaderService` from `RankingModule`; all 16 resolver call sites inject it directly (no intermediate wrapper).

**Rationale**: All 16 call sites already import `RankingModule`. Adding `RankingSystemLoaderService` to `RankingModule`'s exports makes it available to all consumers without any new module declarations.

**Call sites confirmed** (16 total, via grep on `getById` in resolver files):
- `lastRankingPlace.resolver.ts` (rankingSystem field resolver)
- `rankingPoint.resolver.ts` (system field resolver)
- `rankingSystemGroup.resolver.ts`
- `assembly.resolver.ts` (titularsPlayers + baseTeamPlayers)
- `subevent.resolver.ts` (recalculate mutations — note: these are mutations, not field resolvers; DataLoader benefit is minimal here but injection change is still correct)
- `encounter.resolver.ts` (recalculate mutation)
- Remaining call sites identified during implementation (target: 16 total)

## Decision: No new npm dependency

**Decision**: `dataloader` v2 is already in `package.json` from feature 019. No new dependency needed.
