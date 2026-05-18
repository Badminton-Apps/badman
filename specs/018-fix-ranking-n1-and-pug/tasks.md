---
description: "Task list for feature 018-fix-ranking-n1-and-pug"
---

# Tasks: Fix RankingSystem N+1 queries and clubenrollment pug syntax error

**Input**: Design documents from `/specs/018-fix-ranking-n1-and-pug/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/ranking-system-service.md](./contracts/ranking-system-service.md), [quickstart.md](./quickstart.md)

**Tests**: Required. Constitution Principle IV (Resolver Test Discipline) is non-negotiable for any change to a resolver in this repo; new service tests are added under the same Jest pattern.

**Organization**: Tasks grouped by user story so each can be implemented, tested, and merged independently. US3 (pug) is completely independent of US1/US2 (cache). US1 and US2 share the same foundational service (Phase 2) but their resolvers are independent thereafter.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependencies on still-open tasks)
- **[Story]**: maps to user stories in [spec.md](./spec.md) — US1 (PlayerEncounterCompetitions N+1), US2 (GetClubPlayers N+1), US3 (clubenrollment pug)

## Path conventions

Nx monorepo backend. All paths are repo-relative.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm working tree state. Branch and spec already exist (`018-fix-ranking-n1-and-pug`), so this phase is minimal.

- [ ] T001 Run `nx affected:test --base=develop --dry-run` from repo root to capture the baseline of currently-affected projects; record the list in a short note in `specs/018-fix-ranking-n1-and-pug/quickstart.md` under "Baseline".

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the cached `RankingSystemService` that US1 and US2 both depend on. US3 does NOT depend on this phase.

**⚠️ CRITICAL**: US1 and US2 cannot begin until T005 lands (service available for injection).

- [ ] T002 Create folder `libs/backend/ranking/src/services/system/` and add an empty barrel `libs/backend/ranking/src/services/system/index.ts` (re-exports the service once T003 lands).
- [ ] T003 Implement `libs/backend/ranking/src/services/system/ranking-system.service.ts` per [contracts/ranking-system-service.md](./contracts/ranking-system-service.md): `@Injectable()` class with private `primaryCache` slot, private `byIdCache: Map<string, …>`, `TTL_MS = 5 * 60 * 1000`, in-flight promise de-duplication (data-model R-IM-001), `Logger.debug` on miss/invalidate only (spec FR-013), no logging on hit.
- [ ] T004 [P] Write `libs/backend/ranking/src/services/system/ranking-system.service.spec.ts` covering: (a) `getPrimary` miss issues one `findOne` call; (b) `getPrimary` hit issues zero calls within TTL; (c) `getPrimary` expiry triggers fresh call after `jest.advanceTimersByTime(TTL_MS)`; (d) N concurrent `getPrimary` callers share one DB call; (e) `getById(id)` hit/miss/expiry; (f) `getById(id)` returning `null` is NOT cached (next call re-queries); (g) `invalidate()` empties both slots; (h) `Logger.debug` called on miss and `invalidate()`, not on hit. Use `jest.useFakeTimers()` and `jest.spyOn(RankingSystem, 'findOne'|'findByPk')`. No real DB.
- [ ] T005 Wire `RankingSystemService` into `libs/backend/ranking/src/ranking.module.ts`: add to `providers` and `exports`. Update `libs/backend/ranking/src/services/index.ts` to re-export from `./system`. Verify `nx build backend-ranking` succeeds.

**Checkpoint**: `RankingSystemService` is available via `@badman/backend-ranking` import. US1 and US2 may begin in parallel.

---

## Phase 3: User Story 1 — Player can open competition history without redundant queries (Priority: P1) 🎯 MVP

**Goal**: Eliminate the N+1 against `RankingSystems WHERE primary = true` triggered per game in the `PlayerEncounterCompetitions` operation.

**Independent Test**: With Sequelize logging on, run `PlayerEncounterCompetitions` against a player with ≥ 20 encounters. Confirm exactly one (or zero, if warm) `RankingSystems WHERE primary = true` query per request, regardless of game count. See Spec SC-001 and quickstart.md §A1–A2.

- [ ] T006 [US1] Add `RankingModule` to `imports` in `libs/backend/graphql/src/resolvers/game/game.module.ts`. Verify `nx build backend-graphql` succeeds.
- [ ] T007 [US1] Edit `libs/backend/graphql/src/resolvers/game/game.resolver.ts`: inject `RankingSystemService` via the existing constructor (currently injects `Sequelize`); replace the `RankingSystem.findOne({ where: { primary: true } })` at lines 102–107 with `await this.rankingSystemService.getPrimary()`. Preserve the existing `NotFoundException("No primary ranking system found")` when the returned value is `null`. Remove the now-unused `RankingSystem` import if no other reference remains.
- [ ] T008 [US1] Update `libs/backend/graphql/src/resolvers/game/game.resolver.spec.ts` (create if missing — follow [enrollmentSetting.resolver.spec.ts](../../libs/backend/graphql/src/resolvers/enrollmentSetting/enrollmentSetting.resolver.spec.ts) pattern). Add cases for the `players` ResolveField: (a) when all `GamePlayerMembership` have non-null rankings, `rankingSystemService.getPrimary` is NOT called; (b) when any membership has a null ranking, `getPrimary` is called exactly once and the returned system is used for `getRankingProtected`; (c) when `getPrimary` returns `null`, the resolver throws `NotFoundException`. Mock `RankingSystemService` with a jest.fn().
- [ ] T009 [US1] Run `nx test backend-graphql --testFile=game.resolver.spec.ts` (or equivalent); verify it passes. Then run the quickstart §A1–A2 procedure manually against local DB and capture the Sequelize log evidence in the PR description.

**Checkpoint**: US1 deliverable can be merged independently. PlayerEncounterCompetitions N+1 is closed.

---

## Phase 4: User Story 2 — Club admin can list players without N+1 alerts (Priority: P1)

**Goal**: Eliminate the N+1 against `RankingSystems WHERE id IN (…)` triggered per `RankingPlace` / `RankingLastPlace` row in the `GetClubPlayers` operation (and any other consumer of these resolvers).

**Independent Test**: With Sequelize logging on, run `GetClubPlayers` against a club with ≥ 30 members requesting `rankingLastPlaces { rankingSystem { … } }`. Confirm at most one `RankingSystems WHERE id = …` query per unique `systemId` in the response. See Spec SC-002 and quickstart.md §A3.

- [ ] T010 [US2] Edit `libs/backend/graphql/src/resolvers/ranking/rankingPlace.resolver.ts`: add `RankingSystemService` to the constructor (alongside the existing `Sequelize` injection). Replace the three direct `RankingSystem.findByPk(place.systemId, …)` / `rankingPlace.getRankingSystem()` calls at lines 31, 52, and 67–70 with `this.rankingSystemService.getById(...)`. Preserve the existing `NotFoundException` paths when the service returns `null`. The attribute projection on lines 31 and 52 is dropped on purpose (cache is full-row by design — research R8 / contract "Migration-only consumers").
- [ ] T011 [P] [US2] Edit `libs/backend/graphql/src/resolvers/ranking/lastRankingPlace.resolver.ts`: add a constructor with `private readonly rankingSystemService: RankingSystemService` (file currently has none). Replace `rankingPlace.getRankingSystem()` on line 44 with `this.rankingSystemService.getById(rankingPlace.systemId)`. If the service returns `null`, throw `NotFoundException` to match the existing repo convention.
- [ ] T012 [P] [US2] Write `libs/backend/graphql/src/resolvers/ranking/rankingPlace.resolver.spec.ts` covering: (a) `rankingPlace(id)` query path when system has all levels set — `getById` is NOT called; (b) path when single/double/mix is null — `getById` is called exactly once with `place.systemId`; (c) `getById` returning `null` triggers `NotFoundException`; (d) `rankingSystem` ResolveField calls `getById(place.systemId)` and returns its value. Follow the standard Sequelize/transaction mock pattern.
- [ ] T013 [P] [US2] Write `libs/backend/graphql/src/resolvers/ranking/lastRankingPlace.resolver.spec.ts` covering: (a) `rankingSystem` ResolveField calls `getById(rankingPlace.systemId)`; (b) returns the resolved system on success; (c) `null` from service surfaces as `NotFoundException` (or matches the chosen failure mode from T011).
- [ ] T014 [US2] Run `nx test backend-graphql --testPathPattern=ranking/(rankingPlace|lastRankingPlace)\.resolver\.spec`; verify pass. Then run quickstart.md §A3 manually and capture Sequelize logs in the PR.

**Checkpoint**: US2 deliverable can be merged independently of US1 once Phase 2 is in place. GetClubPlayers N+1 is closed.

---

## Phase 5: User Story 3 — Club admin receives the enrollment confirmation email (Priority: P1)

**Goal**: Fix the pug `Syntax Error: Unexpected token` thrown when rendering `clubenrollment/html.pug` so the email is delivered after every successful enrollment finalization.

**Independent Test**: Trigger the local enrollment finalize mutation against a club with three teams — one with a complete entry, one with `entry = null`, one with `entry.meta = null`. The mutation returns `notificationDispatched: true` and an email arrives in the local mail catcher. See Spec User Story 3 and quickstart.md §B.

**Note**: This phase is INDEPENDENT of Phase 2/3/4. It can be implemented and merged before the cache work, or in parallel.

- [ ] T015 [P] [US3] Edit `libs/backend/mailing/src/compile/templates/clubenrollment/html.pug` line 33: replace `if team?.entry?.subEventCompetition?.eventCompetition?.name && team?.entry?.subEventCompetition?.name` with `if team && team.entry && team.entry.subEventCompetition && team.entry.subEventCompetition.eventCompetition && team.entry.subEventCompetition.eventCompetition.name && team.entry.subEventCompetition.name`.
- [ ] T016 [P] [US3] Edit the same file line 46: replace `each player in team.entry?.meta?.competition?.players || []` with `each player in (team.entry && team.entry.meta && team.entry.meta.competition && team.entry.meta.competition.players) || []`.
- [ ] T017 [US3] Sweep all other pug templates: run `grep -rn "?\\." libs/backend/mailing/src/compile/templates/` from repo root. For any additional matches inside `if` / `each` / `case` expressions, apply the same explicit-null-guard transform. If the only matches are inside `#{ … }` interpolations (which DO accept `?.`), leave them alone — the lexer error only fires on conditional expression contexts. Document the sweep result in the PR description.
- [ ] T018 [US3] Add or update a renderer test in `libs/backend/mailing/src/compile/services/compile.service.spec.ts` (create if missing) that calls `CompileService.toHtml("clubenrollment", fixture)` for three fixtures: complete entry, missing entry, missing `entry.meta`. Assert each call resolves (no throw) and that the produced HTML contains the expected fallback strings ("Geen afdeling gekozen", "Kapitein niet ingevuld") in the appropriate cases.
- [ ] T019 [US3] Run `nx test backend-mailing`; verify pass. Then run quickstart.md §B2 manually and confirm the confirmation email is received locally.

**Checkpoint**: US3 deliverable can be merged independently. clubenrollment Sentry issue is closed.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Wire cache invalidation into existing `RankingSystem` mutations; run the full verification suite; prep release notes.

**Note**: T020–T022 are only needed if Phase 2 has shipped (US1 or US2 merged). If only US3 ships, skip to T024.

- [ ] T020 Edit `libs/backend/graphql/src/resolvers/ranking/rankingSystem.resolver.ts`: inject `RankingSystemService` (constructor). For each of the 7 mutations (lines 84, 136, 212, 252, 292, 371, 420 — the last returns `Boolean`), add `this.rankingSystemService.invalidate();` inside the try block immediately AFTER `await transaction.commit();` succeeds, BEFORE the return statement. Do NOT call from any `catch` block. See contract "Invalidation consumers".
- [ ] T021 [P] Update or create `libs/backend/graphql/src/resolvers/ranking/rankingSystem.resolver.spec.ts` with one test per mutation asserting that `rankingSystemService.invalidate` is called exactly once on the happy path AND that it is NOT called when the mutation rolls back (force the inner code to throw, assert rollback ran, assert invalidate did NOT run). Mock the service with jest.fn().
- [ ] T022 Run `nx affected:test --base=develop` and `nx affected:lint --base=develop` and `prettier --check .` from repo root. Fix any failures introduced by this branch (typing, import order, formatting).
- [ ] T023 [P] Run quickstart.md §A4 (TTL re-hit) and §A5 (invalidation cold-read) against the local API to validate end-to-end behavior. Capture command output in the PR description.
- [ ] T024 Open the PR against `develop`. Title: `fix(backend): RankingSystem N+1 cache + clubenrollment pug syntax`. Body MUST cite Sentry issues 119703170 (GetClubPlayers N+1), 119737606 (PlayerEncounterCompetitions N+1), 119679018 (pug syntax). Mention Constitution Principle III (mutation invalidation, post-commit) and Principle IV (resolver tests) as touched. Link this spec directory.

---

## Dependencies

```
Phase 1 (Setup)
   ↓
Phase 2 (Foundational: RankingSystemService) ───────┐
   ↓                                                 │
Phase 3 (US1: Game.players)                          │
                                                     │
Phase 4 (US2: RankingPlace + RankingLastPlace) ──────┤
                                                     │
Phase 5 (US3: clubenrollment pug)  ← independent ────┘
                                                     │
Phase 6 (Polish: invalidation + lint + PR)  ←────────┘
```

- T001 has no deps.
- T002 → T003 → T004 (parallel to T005) → T005 forms the Phase 2 critical path.
- T006 → T007 → T008 → T009 forms the US1 chain. All depend on T005.
- T010 → T014 forms the US2 chain. T011, T012, T013 are parallel-safe siblings to T010. All depend on T005.
- T015–T019 are independent of Phase 2; T015 and T016 are parallel-safe (same file, different lines — sequentialise if you want a single commit). T017 is a sweep across other files. T018 and T019 follow.
- T020–T021 depend on Phase 2 (service exists). T022–T024 are end-of-branch polish.

## Parallel execution examples

**Inside Phase 2 (after T003 lands)**:
- T004 (service spec) can run in parallel with T005 (module wiring).

**Inside Phase 4 (after T010 lands)**:
- T011, T012, T013 are three independent files — three engineers (or three agents) can run them simultaneously.

**Across phases (after Phase 2 lands)**:
- An engineer takes Phase 3 (US1) while another takes Phase 4 (US2). They never touch the same files.
- A third engineer takes Phase 5 (US3) in parallel — it does not touch any resolver or service file.

## Implementation strategy (MVP-first)

The smallest deployable unit that closes a Sentry issue is:

- **MVP1**: Phase 1 + Phase 5 (US3 only). Ships the pug fix; closes Sentry 119679018; restores enrollment emails. Zero risk to the cache work. ~ 30 min.
- **MVP2**: Phase 1 + Phase 2 + Phase 3 + Phase 6 (US1 only). Ships the cache + PlayerEncounterCompetitions resolver migration; closes Sentry 119737606. ~ 2–3 hours.
- **MVP3**: Phase 1 + Phase 2 + Phase 4 + Phase 6 (US2 only). Ships the cache + RankingPlace/RankingLastPlace migration; closes Sentry 119703170. ~ 2 hours.
- **Full branch**: all five phases.

Recommended path: ship all three in one PR (this branch). All changes are small, the cache service is reused across US1 and US2, and Sentry verification is cleaner when all three issues close together. The MVP decomposition is documented so the work can be split across reviewers or split into staged commits if needed.

## Independent test criteria summary

| Story | Test | Pass signal |
|-------|------|-------------|
| US1 | quickstart.md §A2 against local DB with ≥ 20 encounters | exactly 1 `RankingSystems WHERE primary=true` per request |
| US2 | quickstart.md §A3 against local DB with ≥ 30 members | ≤ 1 `RankingSystems WHERE id = …` per unique systemId |
| US3 | quickstart.md §B2 against local enrollment flow | mutation returns `notificationDispatched: true` and email arrives |

## Format validation

All 24 tasks above use the strict checklist format: `- [ ] TaskID [P?] [Story?] description with file path`. Setup, Foundational, and Polish tasks omit the `[Story]` label per spec. User-story phase tasks (T006–T019) carry the correct `[US1]` / `[US2]` / `[US3]` labels.
