# Tasks: Eliminate conditional per-player RankingPlace fallback in assembly resolver

**Input**: Design documents from `specs/021-dataloader-assembly-player-ranking/`
**Branch**: `021-dataloader-assembly-player-ranking`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify association alias before modifying code.

- [ ] T001 Confirm `Player.hasMany(RankingPlace)` association declaration and alias in `libs/backend/database/src/models/player.model.ts` — verify the property name matches `this.rankingPlaces` used by `getCurrentRanking` at line ~363 of the same file

---

## Phase 2: Foundational (Blocking Prerequisites)

No foundational work needed — feature touches a single resolver file. Proceed directly to User Story 1.

---

## Phase 3: User Story 1 — Assembly validation issues no per-player DB queries for unranked players (Priority: P1) 🎯 MVP

**Goal**: `Player.findAll` in `titularsPlayers` and `baseTeamPlayers` includes `RankingPlace` so `getCurrentRanking` never falls back to `getRankingPlaces()` (a per-player DB call).

**Independent Test**: Spy on `Player.prototype.getRankingPlaces` (or `RankingPlace.findAll`) in an assembly resolver unit test where players have no `RankingLastPlace` for the given systemId. Assert spy is **NOT** called after `getCurrentRanking` resolves.

### Implementation for User Story 1

- [ ] T002 [P] [US1] Add `RankingPlace` to the `include` array of the `titularsPlayers` `Player.findAll` call (~line 38) in `libs/backend/graphql/src/resolvers/event/competition/assembly.resolver.ts`
- [ ] T003 [P] [US1] Add `RankingPlace` to the `include` array of the `baseTeamPlayers` `Player.findAll` call (~line 74) in `libs/backend/graphql/src/resolvers/event/competition/assembly.resolver.ts`
- [ ] T004 [US1] Update `libs/backend/graphql/src/resolvers/event/competition/assembly.resolver.spec.ts`: invert any test spy that previously asserted `getRankingPlaces()` IS called for unranked players — assert it is **NOT** called; add test case confirming `null` return when player has no ranking rows in either table
- [ ] T005 [US1] Run `nx test backend-graphql --testFile=assembly.resolver.spec.ts`; confirm all tests pass

**Checkpoint**: Both `Player.findAll` calls include `[RankingLastPlace, RankingPlace]`. Tests confirm `getRankingPlaces()` not called. Output shape unchanged.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [ ] T006 Run full `nx test backend-graphql`; confirm no regressions
- [ ] T007 [P] Run `nx lint backend-graphql`; confirm no lint warnings
- [ ] T008 [P] Run `nx build backend-graphql --skip-nx-cache`; confirm zero TypeScript errors

---

## Dependencies & Execution Order

- **Phase 1 (T001)**: Run first — confirms alias before writing code
- **Phase 3 (T002, T003)**: Can run in parallel (same file, non-overlapping lines)
- **T004**: Depends on T002 + T003 complete
- **T005**: Depends on T004
- **Phase 4**: Depends on Phase 3 complete

---

## Implementation Strategy

Minimal change — two `include` array additions in one resolver file plus test inversion. Total estimated: 15–30 minutes.

1. Confirm alias (T001)
2. Add both includes (T002, T003 in parallel)
3. Update test assertions (T004)
4. Verify tests pass (T005)
5. Full test + lint + build (T006–T008)
