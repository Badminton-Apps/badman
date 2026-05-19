# Feature Specification: Eliminate conditional per-player RankingPlace fallback in assembly resolver

**Feature Branch**: `021-dataloader-assembly-player-ranking`
**Created**: 2026-05-19
**Status**: Draft
**Input**: User description: "Player.getCurrentRanking per-player loop in assembly.resolver.ts — conditional getRankingPlaces() DB call per player when that player has no RankingLastPlace for the requested system. Fix by including RankingPlace in the initial Player.findAll so the fallback reads from memory rather than issuing per-player queries."

> **Spec correction note**: The original opt-in candidate in spec 019 described this as "one RankingLastPlace query per player — batch by playerId". That was incorrect. Code inspection shows `Player.findAll` in both `titularsPlayers` and `baseTeamPlayers` already eagerly loads `RankingLastPlace` via `include: [RankingLastPlace]`. The method `player.getCurrentRanking(systemId)` reads from that already-loaded data in the common case. However, if no `RankingLastPlace` row exists for the requested `systemId`, `getCurrentRanking` falls back to `this.getRankingPlaces()` — a separate per-player DB call on the `RankingPlace` table. This is the actual N+1: conditional, triggered only for players without a lastPlace in the given system.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Assembly validation issues no per-player DB queries for unranked players (Priority: P1)

A competition coordinator validates an assembly for a team that includes players who are new to the system (no `RankingLastPlace` row for the competition's ranking system). Today, `player.getCurrentRanking(systemId)` finds no `RankingLastPlace` match for those players and falls back to `this.getRankingPlaces()` — one additional `RankingPlace` DB query per unranked player. After this change, the initial `Player.findAll` includes both `RankingLastPlace` and `RankingPlace` via eager loading, so `getCurrentRanking` reads from memory in all cases. The coordinator sees identical output; the backend issues no conditional per-player fallback queries.

**Why this priority**: The `getRankingPlaces()` fallback issues one DB query per player with missing data. During competition entry for new players or cross-system validation, this produces visible N+1 latency. The fix is an eager-load addition to an existing batch query — low risk, high value.

**Independent Test**: Spy on `player.getRankingPlaces` (or the underlying `RankingPlace.findAll`) during an assembly resolver unit test where players have no `RankingLastPlace` for the given system. Assert the spy is NOT called after `getCurrentRanking` resolves. No infrastructure required.

**Acceptance Scenarios**:

1. **Given** an assembly with 10 players all having a `RankingLastPlace` for the given `systemId`, **When** `titularsPlayers` or `baseTeamPlayers` resolves, **Then** no DB queries beyond the initial `Player.findAll` are issued.
2. **Given** an assembly with 10 players where 3 have no `RankingLastPlace` for the given `systemId`, **When** `titularsPlayers` or `baseTeamPlayers` resolves, **Then** no per-player `getRankingPlaces()` DB calls are issued — the `RankingPlace` data is read from the eager-loaded include.
3. **Given** a player with `RankingPlace` rows for the system but no `RankingLastPlace`, **When** `getCurrentRanking` resolves, **Then** the most recent `RankingPlace` row (sorted by `rankingDate`) is returned — identical to the pre-feature fallback behaviour.
4. **Given** a player with neither `RankingLastPlace` nor `RankingPlace` for the system, **When** `getCurrentRanking` resolves, **Then** `null` is returned — same as the pre-feature result.

---

### Edge Cases

- Player has `RankingLastPlace` for the system: prefers lastPlace (unchanged behaviour — lastPlace is checked first in `getCurrentRanking`).
- Player has `RankingLastPlace` for OTHER systems only: no lastPlace match → falls through to the eager-loaded `RankingPlace` data instead of issuing a DB query.
- Player has no rows in either table for the system: returns `null` (unchanged).
- `assembly.systemId` is null or undefined: `getCurrentRanking("")` returns `null` (unchanged — already guarded by the resolver).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The `Player.findAll` calls in `titularsPlayers` (`assembly.resolver.ts` ~line 38) and `baseTeamPlayers` (~line 74) MUST add `RankingPlace` to their `include` array alongside the existing `RankingLastPlace` include.
- **FR-002**: `player.getCurrentRanking(systemId)` MUST continue to prefer `RankingLastPlace` over `RankingPlace` when both are available for the given system — the selection logic in `player.model.ts:349` is NOT changed.
- **FR-003**: After this change, `getCurrentRanking` MUST NOT issue any DB call for players returned by the assembly resolver's `Player.findAll` (all association data is pre-loaded).
- **FR-004**: System MUST NOT change the output type, field names, or nullability of `titularsPlayers` or `baseTeamPlayers`.
- **FR-005**: Existing unit tests for `assembly.resolver.ts` MUST continue to pass. Tests that previously spied on `getRankingPlaces()` being called for unranked players MUST be updated to reflect that the call no longer occurs.

### Key Entities

- **AssemblyResolver**: `libs/backend/graphql/src/resolvers/event/competition/assembly.resolver.ts`. Two `Player.findAll` calls receiving the additional `RankingPlace` include.
- **RankingPlace**: Sequelize model in the `ranking` schema. Added to the `include` of the `Player.findAll` to cover the fallback case in `getCurrentRanking`.
- **RankingLastPlace**: Already included — no change.
- **Player.getCurrentRanking**: Instance method at `libs/backend/database/src/models/player.model.ts:349`. Not modified; its existing logic works correctly once both associations are pre-loaded.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For an assembly validation request with N players where M have no `RankingLastPlace` for the system, the number of extra `RankingPlace` DB queries drops from M to 0 — data is loaded as part of the initial batched `Player.findAll`.
- **SC-002**: The `Player.findAll` call count remains 1 per `titularsPlayers` invocation and 1 per `baseTeamPlayers` invocation — no additional batch queries introduced.
- **SC-003**: Assembly validation response output is byte-for-byte equivalent for players with existing ranking data before and after the change.
- **SC-004**: Zero new TypeScript errors, lint warnings, or test failures.

## Assumptions

- `Player.hasMany(RankingPlace)` association is already declared in the Player model (confirmed: `getCurrentRanking` calls `this.getRankingPlaces()` which implies the association exists).
- `RankingPlace` rows are small in number per player (typically a handful — one per ranking period per system); eager-loading them does not materially increase result set size or memory.
- This fix does NOT require a DataLoader — the existing `Player.findAll` batching is sufficient; only the include list is extended.
- No Sentry pre-condition required: the N+1 is confirmed by code inspection (`player.model.ts:363` calls `this.getRankingPlaces()` unconditionally when no lastPlace matches the system).
