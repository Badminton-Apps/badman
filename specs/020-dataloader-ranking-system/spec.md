# Feature Specification: DataLoader for RankingSystemService per-request dedup

**Feature Branch**: `020-dataloader-ranking-system`
**Created**: 2026-05-19
**Status**: Draft
**Input**: User description: "Add a request-scoped DataLoader wrapper around RankingSystemService.getById. The existing RankingSystemService is module-scoped with a 5-minute in-memory TTL cache. 16 resolver field-resolvers call getById per row, each triggering a Map lookup and async wrapper even when the cache is warm. getById already deduplicates concurrent in-flight DB calls via an inflight Map, but does NOT deduplicate per-request-tick callers with the same id once the cache is warm — each caller gets its own Promise wrapper. Add a thin request-scoped NestJS service (RankingSystemLoaderService) that owns one DataLoader<string, RankingSystem> per request. The DataLoader batch fn calls the module-scoped RankingSystemService.getById for each unique key (hitting the TTL cache, not the DB). This gains per-request-tick id dedup — if 50 rankingPlace rows share one systemId, only one getById call is made in that request tick — while preserving the cross-request 5-min cache. Note: getById does NOT cache null/not-found results. No DB query pattern changes. Inject RankingSystemLoaderService into the 16 resolver call sites that currently call RankingSystemService.getById directly."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Backend engineer sees one getById call per unique systemId per request (Priority: P1)

A backend engineer queries a list of ranking places (e.g., `getRankingLastPlaces` returning 50 rows). All rows share the same `systemId`. Today each row's field resolver calls `RankingSystemService.getById` independently — 50 Map lookups plus 50 async Promise wrappers for the same cached value in one request tick. `getById` already shares a single DB round-trip for truly concurrent callers (inflight Map), but once the cache is warm each per-tick call still goes through the full async path independently. After this change, a `RankingSystemLoaderService` (request-scoped) batches all `systemId` values arriving in one microtask tick and issues a single `getById` call per unique id. The engineer confirms via logging or a spy in tests that `RankingSystemService.getById` is called exactly once for that request despite 50 rows sharing the same id.

**Why this priority**: Eliminates N redundant calls to the cached service per request. Even though the cache avoids DB hits, 50 Promise resolutions where 1 would do adds unnecessary microtask overhead and obscures future profiling.

**Independent Test**: Spy on `RankingSystemService.getById` during a resolver test that returns 10 ranking-place rows with the same systemId. Assert the spy is called exactly once. No DB or infrastructure required.

**Acceptance Scenarios**:

1. **Given** a GraphQL request returning 50 `RankingLastPlace` rows all with `systemId = "abc"`, **When** each row's field resolver resolves `rankingSystem`, **Then** `RankingSystemService.getById("abc")` is called exactly once within that request.
2. **Given** a request returning rows with two distinct systemIds (`"abc"` and `"def"`), **When** the resolver tree runs, **Then** `getById` is called exactly twice — once per unique id.
3. **Given** a second request arriving after the first completes, **When** its resolver tree runs, **Then** a fresh `RankingSystemLoaderService` instance is created and the dedup counter resets to zero — no cross-request state leaks.
4. **Given** `RankingSystemService.getById` returns a RankingSystem from its 5-minute cache, **When** the DataLoader batch fn resolves, **Then** all callers sharing that id receive the same cached object without additional DB queries.

---

### Edge Cases

- `systemId` is `null` or `undefined` on a row. The field resolver must guard before calling `loader.load()` and return `null` without dispatching a batch key.
- `RankingSystemService.getById` throws (e.g., cache miss escalates to a failed DB lookup). The error propagates through every `.load()` caller sharing that key; the loader does not swallow or retry.
- Multiple resolvers inject `RankingSystemLoaderService`; they all receive the same request-scoped instance and share the same DataLoader, ensuring cross-resolver dedup within one request.
- A resolver that previously injected `RankingSystemService` directly is migrated to `RankingSystemLoaderService`. Its public call site changes only in the injected token name, not the return type.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST introduce `RankingSystemLoaderService`, a request-scoped NestJS service, that owns one `DataLoader<string, RankingSystem>` instance per HTTP/GraphQL request.
- **FR-002**: The DataLoader batch function in `RankingSystemLoaderService` MUST delegate each unique key to `RankingSystemService.getById` (the existing module-scoped cached service) and return results in input-key order.
- **FR-003**: `RankingSystemLoaderService` MUST be registered with `Scope.REQUEST` so each GraphQL request receives a fresh instance and no DataLoader state leaks across requests.
- **FR-004**: All resolver field-resolvers that currently call `RankingSystemService.getById` directly MUST be updated to inject and use `RankingSystemLoaderService.load(id)` instead.
- **FR-005**: `RankingSystemService` and its module-scoped 5-minute TTL cache MUST remain unchanged — `RankingSystemLoaderService` is a pure consumer, not a replacement.
- **FR-006**: System MUST NOT introduce additional database queries. The DataLoader batch fn relies entirely on the existing in-memory TTL cache in `RankingSystemService`.
- **FR-007**: Existing unit tests for `RankingSystemService` MUST continue to pass without modification.
- **FR-008**: `RankingSystemLoaderService` MUST be exported from `RankingModule` (or the appropriate module) so it can be injected into resolver modules that already import `RankingModule`.
- **FR-009**: Null/not-found results from `RankingSystemService.getById` (id does not exist) MUST NOT be cached by the DataLoader across request ticks; they propagate as `null` to the caller for that request only.

### Key Entities

- **RankingSystemLoaderService**: New request-scoped service owning one `DataLoader<string, RankingSystem>`. Created fresh per request by NestJS DI.
- **RankingSystemService**: Existing module-scoped service with 5-minute TTL cache. Unchanged; called by the DataLoader batch fn.
- **DataLoader**: Per-request instance that deduplicates `systemId` lookups within a single microtask tick.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For any GraphQL request returning N ranking rows sharing one systemId, `RankingSystemService.getById` is called exactly once — down from N calls before this change.
- **SC-002**: For any GraphQL request returning rows with K distinct systemIds, `RankingSystemService.getById` is called exactly K times — regardless of how many rows share each id.
- **SC-003**: Zero new database queries are introduced relative to the pre-feature baseline for any query involving `RankingSystem` field resolution.
- **SC-004**: Zero cross-request state leaks — a spy tracking DataLoader instance identity confirms a fresh instance per request.
- **SC-005**: All pre-existing resolver unit tests pass without assertion changes. Zero new TypeScript errors or lint warnings.

## Assumptions

- The `dataloader` npm package (v2.x) is already a runtime dependency (added in feature 019-graphql-dataloader).
- Grep over resolver files confirmed 16 `getById` call sites in `libs/backend/graphql/`; none are in worker apps.
- `RankingSystemService.getById` is safe to call concurrently from multiple batch-fn invocations in the same tick (it returns a cached Promise, so concurrent calls are idempotent).
- No Sentry pre-condition check is required for this feature because the N+1 pattern here is within the in-memory cache layer (not the DB), making it low-risk to batch speculatively given the confirmed 18-resolver count.
