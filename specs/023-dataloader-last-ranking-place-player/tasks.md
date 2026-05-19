# Tasks: DataLoader for RankingLastPlace.player field resolver

**Input**: Design documents from `specs/023-dataloader-last-ranking-place-player/`
**Branch**: `023-dataloader-last-ranking-place-player`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓
**Pre-condition gate**: Sentry N+1 alert on `RankingLastPlace.player` OR documented hot-path test result — document before starting Phase 3.
**Dependency**: Feature 022 (`PlayerLoaderService`) should be merged first; if not, create the service here.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm PlayerLoaderService availability from feature 022.

- [ ] T001 Check if `libs/backend/graphql/src/loaders/player-loader.service.ts` exists (feature 022 merged). If YES → skip to Phase 3. If NO → complete Phase 2 to create it here.

---

## Phase 2: Foundational (Only if feature 022 not yet merged)

**Purpose**: Create `PlayerLoaderService` if 022 has not been merged. Skip this phase if the service already exists.

- [ ] T002 Create `libs/backend/graphql/src/loaders/player-loader.service.ts` with `@Injectable({ scope: Scope.REQUEST })`, null-guard `load(id)` method, and batch fn: `Player.findAll({ where: { id: { [Op.in]: keys } } })` → map results in input-key order with `null` for missing ids
- [ ] T003 Add `PlayerLoaderService` to `providers` and `exports` in `libs/backend/graphql/src/graphql.module.ts` (or `LoadersModule`)
- [ ] T004 Export `PlayerLoaderService` from `libs/backend/graphql/src/loaders/index.ts`

**Checkpoint**: `PlayerLoaderService` available for injection (skip if 022 already merged).

---

## Phase 3: User Story 1 — Ranking places list resolves players in one query (Priority: P1) 🎯 MVP

**Goal**: `LastRankingPlaceResolver.player` uses `PlayerLoaderService.load(playerId)` instead of `rankingPlace.getPlayer()`. N Player DB lookups → 1 per request.

**Independent Test**: Spy on `PlayerLoaderService.load` in a unit test returning 10 `RankingLastPlace` rows. Assert `Player.findAll` called exactly once.

### Implementation for User Story 1

- [ ] T005 [US1] Inject `PlayerLoaderService` into `LastRankingPlaceResolver` constructor and replace `rankingPlace.getPlayer()` with `this.playerLoader.load(rankingPlace.playerId)` at line ~54–56 in `libs/backend/graphql/src/resolvers/ranking/lastRankingPlace.resolver.ts`
- [ ] T006 [US1] Update `libs/backend/graphql/src/resolvers/ranking/lastRankingPlace.resolver.spec.ts`: replace `getPlayer` spy with `PlayerLoaderService.load` spy; assert `Player.findAll` called once for 10-row result; add test for null `playerId` returns null
- [ ] T007 [US1] Run `nx test backend-graphql --testFile=lastRankingPlace.resolver.spec.ts`; confirm all tests pass

**Checkpoint**: `LastRankingPlaceResolver.player` uses loader. Tests confirm 1 `Player.findAll` for N rows.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [ ] T008 Run full `nx test backend-graphql`; confirm no regressions
- [ ] T009 [P] Run `nx lint backend-graphql`; fix any warnings
- [ ] T010 [P] Verify no duplicate `PlayerLoaderService` class exists if both 022 and 023 are merged: `grep -rn "PlayerLoaderService" libs/backend/graphql/src/ --include="*.ts" -l`

---

## Dependencies & Execution Order

- **Phase 1 (T001)**: Start immediately — gates Phase 2
- **Phase 2 (T002–T004)**: Only if 022 not merged
- **Phase 3 (T005–T007)**: Depends on PlayerLoaderService available (via 022 or Phase 2)
- **Phase 4**: Depends on Phase 3

---

## Implementation Strategy

If feature 022 is already merged: this feature is Phase 1 check + Phase 3 (3 tasks). Estimated 15–30 minutes.

If feature 022 is not merged: implement Phases 1–3 together, then reconcile with 022 in a combined PR to avoid a duplicate service.
