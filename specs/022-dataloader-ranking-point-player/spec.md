# Feature Specification: DataLoader for RankingPoint.player field resolver

**Feature Branch**: `022-dataloader-ranking-point-player`
**Created**: 2026-05-19
**Status**: Draft
**Input**: User description: "RankingPoint.player field resolver — one getPlayer() per row today. Batch by playerId across the rankingPoints list."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Fetching a list of ranking points resolves associated players in one query (Priority: P1)

A ranking administrator queries ranking points for a period, receiving a list of N `RankingPoint` rows. Today the `RankingPoint.player` field resolver calls `getPlayer()` once per row — N separate Player lookups. After this change, all `playerId` values from the list are batched into a single `Player.findAll` with an `IN` clause, then each row is matched to its result. The administrator sees no behavioural difference but the backend issues one Player query instead of N.

**Why this priority**: `RankingPoint.player` is a field resolver on every row of a potentially large list. N+1 Player lookups on a ranking-points query returning hundreds of rows produces visible latency and is the canonical DataLoader use case.

**Independent Test**: Spy on `Player.findAll` (or `Player.findByPk`) in a unit test returning 10 `RankingPoint` rows. Assert the spy is called exactly once after all 10 field resolvers resolve.

**Acceptance Scenarios**:

1. **Given** a query returning 20 `RankingPoint` rows each with a distinct `playerId`, **When** the `player` field resolver executes, **Then** exactly one `Player` bulk lookup is issued and each row maps to its correct player.
2. **Given** multiple `RankingPoint` rows share the same `playerId`, **When** the DataLoader deduplicates keys, **Then** only one Player row is fetched for that id and the result is shared.
3. **Given** a `RankingPoint` row whose `playerId` references a player that no longer exists, **When** the batch resolves, **Then** that row's `player` field returns `null` without affecting other rows.
4. **Given** a subsequent GraphQL request for ranking points, **When** it resolves, **Then** a fresh DataLoader instance is used — no player cache from a prior request is reused.

---

### Edge Cases

- `playerId` is null on a `RankingPoint` row. The field resolver returns `null` without adding a key to the batch.
- The batch fn returns fewer players than requested ids (some ids deleted). Each missing id maps to `null` in input-key order, satisfying DataLoader's contract.
- A DB error during the batch fn propagates to all `.load()` callers for that batch; subsequent ticks start fresh.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST replace the per-row `getPlayer()` call in `rankingPoint.resolver.ts:42` with a `DataLoader`-backed lookup that batches all `playerId` values arriving in one microtask tick.
- **FR-002**: The DataLoader batch fn MUST issue a single `Player.findAll({ where: { id: { [Op.in]: keys } } })` and return results mapped to input-key order.
- **FR-003**: The DataLoader instance MUST be request-scoped so player lookups from one request cannot be served from another request's cache.
- **FR-004**: System MUST return `null` for any `playerId` whose `Player` row does not exist, without omitting other rows from the response.
- **FR-005**: System MUST NOT change the `RankingPoint.player` GraphQL field type or nullability.
- **FR-006**: Existing unit and integration tests for `rankingPoint.resolver.ts` MUST continue to pass.

### Key Entities

- **RankingPointResolver**: Resolver at `libs/backend/graphql/src/resolvers/ranking/rankingPoint.resolver.ts`. Owns the `player` field resolver at line 42.
- **Player**: Sequelize model. Fetched in bulk by the DataLoader batch fn.
- **DataLoader**: Per-request instance keyed by `playerId` string.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a query returning N `RankingPoint` rows, the number of Player DB lookups drops from N to 1, regardless of N.
- **SC-002**: For rows sharing a `playerId`, only one DB lookup is performed for that id (dedup confirmed by spy assertion in tests).
- **SC-003**: Zero new TypeScript errors, lint warnings, or test failures relative to the pre-feature baseline.
- **SC-004**: Response payload for identical queries is semantically equivalent before and after the change.

## Assumptions

- The `dataloader` package (v2.x) is already a runtime dependency (added in feature 019-graphql-dataloader).
- `getPlayer()` at line 42 issues a `Player.findByPk` or equivalent single-row fetch; the batch replacement uses `findAll` with `Op.in`.
- Pre-condition for shipping: a Sentry N+1 alert on the `RankingPoint.player` resolver OR a documented hot-path manual test confirming the pattern at scale. Listed as an opt-in candidate in spec 019; activation requires that signal.
- The resolver file (`rankingPoint.resolver.ts`) is the only call site for this particular per-row Player lookup.
