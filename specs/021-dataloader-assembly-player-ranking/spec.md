# Feature Specification: DataLoader for assembly resolver per-player ranking lookups

**Feature Branch**: `021-dataloader-assembly-player-ranking`
**Created**: 2026-05-19
**Status**: Draft
**Input**: User description: "Player.getCurrentRanking per-player loop in assembly.resolver.ts:51,79 — one association query per player today. Batch by playerId into a single RankingLastPlace.findAll."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Assembly validation runs one ranking query per request, not one per player (Priority: P1)

A competition coordinator opens the assembly validation view for a team. The view asks the backend to validate the assembly — a list of 6–16 players whose current ranking must be checked against event constraints. Today `assembly.resolver.ts` loops over players (at lines 51 and 79) and issues one `RankingLastPlace.findAll` per player. After this change, all player ids in the assembly are collected and a single `RankingLastPlace.findAll` with an `IN (…ids…)` clause replaces the loop. The coordinator sees no behavioural difference, but the backend issues one DB query where it previously issued N.

**Why this priority**: Assembly validation is a hot path — called on every assembly change during the competition entry window. The N+1 is confirmed by code inspection (lines 51 and 79 of `assembly.resolver.ts`); each loop iteration contains an independent `findAll`.

**Independent Test**: Spy on `RankingLastPlace.findAll` during an assembly resolver unit test with a 10-player input. Assert the spy is called exactly once (or at most twice — once per the two call sites at lines 51 and 79 if they serve different purposes). No infrastructure required.

**Acceptance Scenarios**:

1. **Given** an assembly validation request with 10 players, **When** the resolver computes current rankings, **Then** at most 2 `RankingLastPlace.findAll` calls are issued (one per logical grouping at lines 51 and 79), regardless of player count.
2. **Given** the same 10-player request repeated, **When** a new GraphQL request resolves it, **Then** a fresh DataLoader instance is used and no ranking results from the previous request are cached.
3. **Given** a player in the assembly has no `RankingLastPlace` row, **When** the batch query returns, **Then** that player maps to `null` and the resolver handles the missing ranking gracefully (no crash, no omission of other players).
4. **Given** two players share the same `playerId` in the input (duplicate), **When** the DataLoader deduplicates keys, **Then** only one DB row fetch is performed for that id and the result is shared between both positions.

---

### Edge Cases

- Assembly list is empty. No DB query is issued; resolver returns an empty result immediately.
- All players have ranking data. Each maps to exactly one `RankingLastPlace` row; no nulls propagate.
- A DB error occurs mid-batch. The error propagates to all callers waiting for that batch; the resolver surfaces an appropriate error response.
- Lines 51 and 79 serve different ranking type contexts (e.g., different `systemId` or `single`/`double`/`mixed`). If they require separate batch dimensions, two DataLoaders may be used — one per dimension — to preserve semantic correctness.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST replace the per-player `RankingLastPlace` lookup loops at `assembly.resolver.ts:51` and `assembly.resolver.ts:79` with a batch query that fetches all required ranking rows in a single `findAll` with an `IN` clause on `playerId`.
- **FR-002**: System MUST preserve existing ranking filter semantics (systemId, type, season, or any other filter currently applied per player) — the batch query must apply the same filters to the combined player set.
- **FR-003**: System MUST return `null` for any player whose `RankingLastPlace` row does not exist, without omitting other players from the result.
- **FR-004**: System MUST NOT change the public API of the assembly resolver — input and output GraphQL types remain identical.
- **FR-005**: The batch logic MUST be request-scoped so ranking results from one assembly validation request cannot bleed into another.
- **FR-006**: Existing unit tests for the assembly resolver MUST continue to pass without weakening call-count or output assertions.

### Key Entities

- **AssemblyResolver**: The NestJS GraphQL resolver at `libs/backend/graphql/src/resolvers/event/competition/assembly.resolver.ts`. Owns the two per-player ranking loops being replaced.
- **RankingLastPlace**: Sequelize model storing each player's most recent ranking position. Queried via `findAll` with player id filter.
- **DataLoader** (or inline batch): Per-request batching mechanism collecting player ids within one resolver tick and issuing one combined DB query.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For an assembly validation request with N players, the number of `RankingLastPlace` DB queries drops from N to at most 2 (one per logical grouping at the two call sites), regardless of N.
- **SC-002**: Assembly validation response time for a 16-player assembly decreases measurably compared to the pre-feature baseline in a local environment with realistic DB latency.
- **SC-003**: Zero new TypeScript errors, lint warnings, or test failures relative to the pre-feature baseline.
- **SC-004**: Resolver output for identical inputs is byte-for-byte equivalent before and after the change (verified by snapshot or deep-equality assertion in the test suite).

## Assumptions

- The `dataloader` package (v2.x) is already a runtime dependency (added in feature 019-graphql-dataloader).
- Lines 51 and 79 of `assembly.resolver.ts` both perform `RankingLastPlace` lookups; their filter dimensions (systemId, type, etc.) will be verified during implementation to confirm whether one or two DataLoaders are needed.
- No Sentry pre-condition is required because the N+1 is confirmed by static code inspection (explicit loops with per-player DB calls) rather than being speculative.
- The assembly resolver is used only during competition entry windows and is not a background-worker code path.
