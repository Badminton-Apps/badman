# Feature Specification: DataLoader for RankingLastPlace.player field resolver

**Feature Branch**: `023-dataloader-last-ranking-place-player`
**Created**: 2026-05-19
**Status**: Draft
**Input**: User description: "RankingLastPlace.player field resolver — same pattern as RankingPoint.player. One getPlayer() per row at lastRankingPlace.resolver.ts:55. Batch by playerId across the rankingLastPlaces list."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Fetching a list of last-ranking-places resolves associated players in one query (Priority: P1)

A ranking administrator or club view queries the current ranking standings, receiving a list of N `RankingLastPlace` rows. Today the `RankingLastPlace.player` field resolver (at `lastRankingPlace.resolver.ts:55`) issues one Player lookup per row. After this change, all `playerId` values are batched into a single Player query and results are distributed back to each row. The administrator sees identical data but the backend issues one Player query regardless of list size.

**Why this priority**: Identical N+1 pattern to 022-dataloader-ranking-point-player. `RankingLastPlace` lists can be large (all ranked players in a system), making this a higher-volume N+1 than the ranking-points variant.

**Independent Test**: Spy on `Player.findAll` in a unit test returning 10 `RankingLastPlace` rows. Assert the spy is called exactly once after all field resolvers resolve.

**Acceptance Scenarios**:

1. **Given** a query returning 30 `RankingLastPlace` rows with distinct `playerId` values, **When** the `player` field resolver executes, **Then** exactly one bulk Player lookup is issued.
2. **Given** multiple rows share the same `playerId`, **When** the DataLoader deduplicates, **Then** one DB fetch is performed for that id and the result is reused across rows.
3. **Given** a `RankingLastPlace` row whose `playerId` no longer has a matching Player record, **When** the batch resolves, **Then** that row's `player` field is `null` without breaking other rows.
4. **Given** a new request for ranking places, **When** it resolves, **Then** a fresh request-scoped DataLoader instance is used — no cross-request player data leaks.

---

### Edge Cases

- `playerId` is null. Field resolver returns `null` without dispatching a batch key.
- Batch fn returns fewer Player rows than requested ids (e.g., deleted players). Missing ids map to `null` in input-key order.
- DB error in batch fn propagates to all callers of that batch; subsequent requests start fresh.
- Resolver is called in a context where only a subset of fields are selected — DataLoader still fires because `player` is requested.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST replace the per-row Player lookup at `lastRankingPlace.resolver.ts:55` with a DataLoader-backed call that batches all `playerId` values arriving in one microtask tick.
- **FR-002**: The DataLoader batch fn MUST issue a single `Player.findAll({ where: { id: { [Op.in]: keys } } })` and return results in input-key order.
- **FR-003**: The DataLoader instance MUST be request-scoped; no player data from one request may be served to another.
- **FR-004**: System MUST return `null` for any `playerId` whose Player record does not exist, without affecting other rows.
- **FR-005**: System MUST NOT change the `RankingLastPlace.player` GraphQL field type or nullability.
- **FR-006**: Existing tests for `lastRankingPlace.resolver.ts` MUST continue to pass without weakening assertions.
- **FR-007**: If a shared `PlayerLoaderService` (request-scoped DataLoader for Player lookups) already exists from feature 022, this resolver MUST reuse it rather than creating a duplicate DataLoader.

### Key Entities

- **LastRankingPlaceResolver**: Resolver at `libs/backend/graphql/src/resolvers/ranking/lastRankingPlace.resolver.ts`. Owns the `player` field resolver at line 55.
- **Player**: Sequelize model fetched in bulk by the DataLoader batch fn.
- **PlayerLoaderService** (shared): Request-scoped service owning the `DataLoader<string, Player>`. May be introduced by feature 022 or by this feature if 022 is not yet merged.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a query returning N `RankingLastPlace` rows, Player DB lookups drop from N to 1 regardless of N.
- **SC-002**: For rows sharing a `playerId`, exactly one DB lookup is issued for that id (confirmed by test spy).
- **SC-003**: Zero new TypeScript errors, lint warnings, or test failures.
- **SC-004**: If merged after 022, no duplicate `PlayerLoaderService` class exists — the shared loader is reused.

## Assumptions

- The `dataloader` package (v2.x) is already a runtime dependency (added in feature 019).
- Features 022 and 023 are candidates to be merged in sequence or together; if merged together, a single `PlayerLoaderService` covers both resolvers.
- Pre-condition for shipping: Sentry N+1 alert on `RankingLastPlace.player` resolver OR documented hot-path manual test result confirming the pattern at scale. Listed as opt-in candidate in spec 019.
- `lastRankingPlace.resolver.ts:55` performs a single-row Player fetch (findByPk or equivalent); the batch replacement uses `findAll` with `Op.in`.
