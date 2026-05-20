---
description: "Task list for feature 027 — Stabilise SearchPlayer under broad search terms"
---

# Tasks: Stabilise SearchPlayer under broad search terms

**Input**: Design documents from `/specs/027-fix-search-player-n1/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/search-player.graphql](./contracts/search-player.graphql), [quickstart.md](./quickstart.md)

**Tests**: REQUIRED. Constitution Principle IV mandates the reference resolver-test pattern for any new / modified resolver code; spec acceptance scenarios 1–6 and SC-002..006 are testable only via Jest unit tests against mocked Sequelize statics.

**Organization**: One user story (US1, P1). All implementation tasks carry the `[US1]` label. Setup, Foundational, and Polish phases carry no story label per the template rules.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[US1]**: Belongs to User Story 1 (the only story in this spec)
- All file paths are repository-relative

## Path Conventions

Nx monorepo. Backend code in `libs/backend/<name>/`. Spec docs in `specs/027-fix-search-player-n1/`. All paths below resolve from repo root `/Users/arno/Documents/Projects/Badman/badman/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify the environment is ready. No scaffolding required — all dependencies and tooling already exist on `main`.

- [X] T001 Verify `dataloader@^2` is already listed in `dependencies` of [package.json](../../package.json); if absent (it should not be), run `npm install dataloader` from repo root. Do NOT add `@types/dataloader` — the package ships its own types.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Lock in the reference pattern the new service must mirror, so reviewers see identical lifecycle and grouping idioms in both player and team helpers.

**⚠️ CRITICAL**: No User Story work begins until this phase is complete.

- [X] T002 Read [libs/backend/graphql/src/resolvers/team/team-association.service.ts](../../libs/backend/graphql/src/resolvers/team/team-association.service.ts) end-to-end. Note: `@Injectable({ scope: Scope.REQUEST })`, single `DataLoader<K, V>` per association, `[Op.in]: [...keys]` spread, `Map`-based grouping, `keys.map(id => grouped.get(id) ?? <default>)` return shape. The new `PlayerAssociationService` MUST follow these idioms verbatim.
- [X] T003 Read [libs/backend/graphql/src/resolvers/team/team-association.service.spec.ts](../../libs/backend/graphql/src/resolvers/team/team-association.service.spec.ts) end-to-end. Note: how the spec sets up `Test.createTestingModule`, mocks `Model.findAll` via `jest.spyOn`, asserts call counts, and verifies grouping. The new service spec MUST follow the same shape.

**Checkpoint**: Pattern internalised. User Story 1 implementation can begin.

---

## Phase 3: User Story 1 — Search query stops crashing and returns capped, batched results (Priority: P1) 🎯 MVP

**Goal**: Replaying the bug-report `SearchPlayer` payload against `nx run api:serve` returns 200 OK in <1 s with ≤200 rows and exactly one `ranking_last_places` SELECT per request, regardless of how broad the iLike fragment is. Schema unchanged.

**Independent Test**: Boot `nx run api:serve`, replay the curl from [quickstart.md §1](./quickstart.md#1-reproduce-the-crash-pre-fix-optional), verify `rows.length ≤ 200`, `count` reflects the true total match count, and the Sequelize log shows exactly one `SELECT … FROM "ranking"."ranking_last_places" WHERE "playerId" IN (…) AND "systemId" = …`. Then run `nx test backend-graphql` and confirm zero failures.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation. Constitution Principle IV requires the reference resolver-test pattern: `Test.createTestingModule`, `jest.spyOn` on model statics, no real DB, `afterEach(jest.restoreAllMocks)`.**

- [X] T004 [P] [US1] Create [libs/backend/graphql/src/resolvers/player/player-association.service.spec.ts](../../libs/backend/graphql/src/resolvers/player/player-association.service.spec.ts) with cases (a) one batch call groups rows by `playerId` and returns arrays in `keys` order (FR-006, FR-010), (b) primary system absent → returns `[]` for every key and does NOT call `RankingLastPlace.findAll` (FR-011), (c) two `.load(id)` calls for the same `playerId` in one tick dedup to one entry in the batch fn input (FR-010), (d) player with no matching rows resolves to `[]` (Acceptance Scenario 6). Use `jest.spyOn(RankingLastPlace, 'findAll')` and a mocked `RankingSystemService` with `getPrimary` jest.fn.
- [X] T005 [P] [US1] Extend [libs/backend/graphql/src/resolvers/player/player.resolver.spec.ts](../../libs/backend/graphql/src/resolvers/player/player.resolver.spec.ts) with three new cases: (a) `players` called without `take` → `Player.findAndCountAll` invoked with `limit: 25` (FR-002, Acceptance Scenario 1), (b) `players` called with `take: 5000` → `findAndCountAll` invoked with `limit: 200` (FR-001, FR-003, Acceptance Scenario 2), (c) `rankingLastPlaces` calls `playerAssociations.getPrimaryRankingLastPlaces(player)` exactly once and maps every returned row through `getRankingProtected` (FR-006, FR-008). Mock the injected `PlayerAssociationService` with `jest.fn()`. Run `nx test backend-graphql` and confirm all three new cases FAIL.

### Implementation for User Story 1

- [X] T006 [P] [US1] Create [libs/backend/graphql/src/resolvers/player/player-association.service.ts](../../libs/backend/graphql/src/resolvers/player/player-association.service.ts). `@Injectable({ scope: Scope.REQUEST })`. Constructor injects `RankingSystemService`. One `DataLoader<string, RankingLastPlace[]>` keyed by `playerId`. Public method `getPrimaryRankingLastPlaces(player: Player): Promise<RankingLastPlace[]>`; if `player.id` falsy, returns `Promise.resolve([])`; else `this.loader.load(player.id)`. Batch function:
  1. `const primary = await this.rankingSystemService.getPrimary();`
  2. `if (!primary) return playerIds.map(() => []);`
  3. `const rows = await RankingLastPlace.findAll({ where: { playerId: { [Op.in]: [...playerIds] }, systemId: primary.id }, order: [["rankingDate","DESC"]] });`
  4. Group by `playerId` into `Map<string, RankingLastPlace[]>`.
  5. `return playerIds.map(id => grouped.get(id) ?? []);`

  Mirrors `TeamAssociationService` line-for-line. Run T004 and confirm it now PASSES.
- [X] T007 [US1] Edit [libs/backend/graphql/src/resolvers/player/player.resolver.ts](../../libs/backend/graphql/src/resolvers/player/player.resolver.ts):
  - Add two module-private constants at the top: `const PLAYERS_DEFAULT_TAKE = 25;` and `const PLAYERS_MAX_TAKE = 200;`.
  - In `players(@Args() listArgs)`, after `const options = ListArgs.toFindOptions(listArgs);`, insert `options.limit = Math.min(options.limit ?? PLAYERS_DEFAULT_TAKE, PLAYERS_MAX_TAKE);` (FR-001..003).
  - Add `PlayerAssociationService` to the constructor parameters: `private readonly playerAssociations: PlayerAssociationService` (alongside existing `_sequelize`, `pointService`, `rankingSystemService`).
  - Rewrite the `rankingLastPlaces` `@ResolveField` body to:
    1. Delete the per-call `await this.rankingSystemService.getPrimary()` and the `player.getRankingLastPlaces(...)` call.
    2. `const places = await this.playerAssociations.getPrimaryRankingLastPlaces(player);`
    3. Keep the existing `const findSystem = await this.loadSystemsByIds(places.map((place) => place.systemId));` + `places.map(...)` decoration with `getRankingProtected(place, system)` (FR-008).
  - Keep `listArgs` arg on the field for schema compatibility but ignore client-supplied `where.systemId` overrides (FR-007 — current behaviour preserved).
  - Do NOT touch `rankingPlaces` (out of scope per Assumptions).

  Run T005 and confirm all three new cases now PASS.
- [X] T008 [US1] Edit [libs/backend/graphql/src/grapqhl.module.ts](../../libs/backend/graphql/src/grapqhl.module.ts) to register `PlayerAssociationService` as a provider alongside `TeamAssociationService`. Use the exact same registration style as `TeamAssociationService`. Re-run `nx test backend-graphql` — full suite must remain green.

**Checkpoint**: User Story 1 fully functional and unit-tested. Ready for end-to-end verification in the Polish phase.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end verification, format/lint cleanup, traceability follow-ups.

- [X] T009 Run `nx test backend-graphql` from repo root. Zero failures, zero new warnings. Existing [libs/backend/graphql/src/resolvers/team/team-association.service.spec.ts](../../libs/backend/graphql/src/resolvers/team/team-association.service.spec.ts) MUST continue to pass without modification (SC-006).
- [X] T010 [P] Run `nx lint backend-graphql` from repo root. Resolve any new warnings before merge (SC-003 equivalent for this feature).
- [X] T011 [P] Run `prettier --check libs/backend/graphql/src/resolvers/player/`. Apply `prettier --write` to fix any drift on the new files.
- [ ] T012 Execute [quickstart.md §3.c](./quickstart.md#c-end-to-end-replay): boot `nx run api:serve` with Sequelize query logging on, replay the bug-report `curl`, and capture log evidence proving exactly one `SELECT … FROM "ranking"."ranking_last_places" WHERE "playerId" IN (…) AND "systemId" = …` per request (SC-002), at most one `RankingSystem` lookup (SC-003), and `rows.length ≤ 200` (SC-004). Paste evidence into the PR description.
- [ ] T013 [P] Documentation follow-up (optional, deferable): add a one-line row to the future-opt-in table in [specs/019-graphql-dataloader/spec.md](../019-graphql-dataloader/spec.md) marking `Player.rankingLastPlaces` as delivered by feature 027, so future readers find it via the same index.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup. Blocks all US1 work.
- **User Story 1 (Phase 3)**: Depends on Foundational.
- **Polish (Phase 4)**: Depends on US1 implementation tasks (T006–T008) being complete.

### Within User Story 1

- T004 and T005 (tests) come first and MUST FAIL before T006/T007 implementation, per Constitution Principle IV.
- T006 (service) before T007 (resolver) — resolver injects the service, so the service file must exist for the type to resolve.
- T008 (module registration) after T006 — the provider exists before being declared.
- T004 and T005 are independent files → parallelisable.
- T006 and T005 reference different files → parallelisable while T005 fails-by-design awaiting T007.

### Parallel Opportunities

- T004 + T005: both test files, no shared state — [P].
- T006 (new service) + T005 (resolver spec edit): different files — [P].
- T010, T011, T013 in Polish: independent reads / edits — [P].

---

## Parallel Example: User Story 1

```bash
# After T002 + T003 lock the pattern in mind, launch these in parallel:
Task: "Write player-association.service.spec.ts (T004)"
Task: "Extend player.resolver.spec.ts with cap + delegation cases (T005)"
Task: "Create player-association.service.ts (T006)"

# T007 (resolver edit) must run after T006 (service exists) and after T005 (failing spec exists).
# T008 (module registration) must run after T006 (provider exists).
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

This feature IS its MVP — one user story, P1 priority. Execute in order: Phase 1 → Phase 2 → Phase 3 (tests-first, then implementation in the documented order) → Phase 4.

### Stop conditions

- After T009 passes locally with the new tests green and old tests untouched: the change is reviewable.
- After T012 produces SQL-log evidence in the PR: the change is mergeable.

### Hand-off

T013 (documentation update of spec 019's catalogue) is the only optional task. Defer if PR scope discipline demands a doc-only follow-up commit.

---

## Notes

- `[P]` tasks = different files, no incomplete dependencies.
- `[US1]` label maps every implementation task to the single user story for traceability.
- Each task lists the exact file path it touches.
- Verify tests fail before implementing (T004, T005 — confirm failure before starting T006, T007).
- Commit after each task or logical group; the auto-commit hook (`after_tasks`) takes care of one commit at the end of this command.
- Avoid: editing `rankingPlaces` (out of scope), generalising the cap into `ListArgs` (research §2), introducing Apollo per-request context plumbing (research §1).
