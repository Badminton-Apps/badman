# Tasks: DataLoader for RankingSystemService per-request dedup

**Input**: Design documents from `specs/020-dataloader-ranking-system/`
**Branch**: `020-dataloader-ranking-system`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm prerequisites; no new directories or packages needed.

- [ ] T001 Confirm `dataloader` v2 is in `libs/backend/ranking/package.json` (or root `package.json`) — no install needed if feature 019 already added it
- [ ] T002 Grep all `RankingSystemService.getById` call sites across `libs/backend/graphql/src/resolvers/` to produce definitive list of 16 resolver files requiring migration: `grep -rn "rankingSystemService.getById\|RankingSystemService" libs/backend/graphql/src/resolvers/ --include="*.ts" -l`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create `RankingSystemLoaderService` and wire it into `RankingModule`. Must complete before any resolver migration.

**⚠️ CRITICAL**: All resolver migrations depend on this service being available.

- [ ] T003 Create `libs/backend/ranking/src/services/system/ranking-system-loader.service.ts` with `@Injectable({ scope: Scope.REQUEST })`, `DataLoader<string, RankingSystem | null>` field, `load(id)` guard method, and batch fn calling `Promise.all(keys.map(id => this.rankingSystemService.getById(id)))`
- [ ] T004 Add `RankingSystemLoaderService` to `providers` and `exports` in `libs/backend/ranking/src/ranking.module.ts`
- [ ] T005 Export `RankingSystemLoaderService` from `libs/backend/ranking/src/services/index.ts` (or equivalent barrel export file)

**Checkpoint**: `nx build backend-ranking` passes — loader service compiles and is exported from RankingModule.

---

## Phase 3: User Story 1 — One getById call per unique systemId per request (Priority: P1) 🎯 MVP

**Goal**: All 16 resolver call sites use `RankingSystemLoaderService.load(id)` instead of `RankingSystemService.getById(id)`. Per-tick dedup collapses N calls to K (K = distinct systemIds).

**Independent Test**: Spy on `RankingSystemService.getById` in a resolver unit test returning 10 rows with the same systemId. Assert spy called exactly once.

### Implementation for User Story 1

- [ ] T006 [P] [US1] Migrate `lastRankingPlace.resolver.ts`: replace `RankingSystemService` injection with `RankingSystemLoaderService`; replace `this.rankingSystemService.getById(id)` with `this.rankingSystemLoaderService.load(id)` in `libs/backend/graphql/src/resolvers/ranking/lastRankingPlace.resolver.ts`
- [ ] T007 [P] [US1] Migrate `rankingPoint.resolver.ts`: same injection + call-site swap in `libs/backend/graphql/src/resolvers/ranking/rankingPoint.resolver.ts`
- [ ] T008 [P] [US1] Migrate `rankingSystemGroup.resolver.ts`: same injection + call-site swap in `libs/backend/graphql/src/resolvers/ranking/rankingSystemGroup.resolver.ts` (all `getById` call sites in the file)
- [ ] T009 [P] [US1] Migrate `assembly.resolver.ts`: same injection + call-site swap in `libs/backend/graphql/src/resolvers/event/competition/assembly.resolver.ts`
- [ ] T010 [P] [US1] Migrate `subevent.resolver.ts`: same injection + call-site swap in `libs/backend/graphql/src/resolvers/event/competition/subevent.resolver.ts`
- [ ] T011 [P] [US1] Migrate `encounter.resolver.ts`: same injection + call-site swap in `libs/backend/graphql/src/resolvers/event/competition/encounter.resolver.ts`
- [ ] T012 [US1] Migrate remaining call sites identified in T002 (expected ~10 additional resolver files): same injection + call-site swap pattern for each file
- [ ] T013 [US1] Update resolver spec files for migrated resolvers: replace `RankingSystemService` spy on `getById` with `RankingSystemLoaderService` spy on `load` in all affected `*.resolver.spec.ts` files
- [ ] T014 [US1] Run `nx test backend-graphql` and `nx test backend-ranking`; confirm all tests pass with zero failures

**Checkpoint**: All 16 call sites migrated. `RankingSystemService.getById` spy called K times (not N) in resolver tests.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [ ] T015 [P] Run `nx lint backend-ranking` and `nx lint backend-graphql`; fix any lint warnings introduced by migration
- [ ] T016 Verify no TypeScript errors: `nx build backend-graphql --skip-nx-cache`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (T001, T002 complete) — blocks all resolver migrations
- **User Story 1 (Phase 3)**: Depends on Phase 2 (T003–T005) — T006–T012 can run in parallel once foundation is ready
- **Polish (Phase 4)**: Depends on Phase 3 complete

### Parallel Opportunities

- T006–T012: all different resolver files — run in parallel after T003–T005 complete
- T013: can start as each resolver is migrated (don't wait for all of T006–T012)

### Parallel Example: User Story 1 resolver migrations

```bash
# After T003-T005 complete, launch all known resolver migrations together:
Task: "Migrate lastRankingPlace.resolver.ts (T006)"
Task: "Migrate rankingPoint.resolver.ts (T007)"
Task: "Migrate rankingSystemGroup.resolver.ts (T008)"
Task: "Migrate assembly.resolver.ts (T009)"
Task: "Migrate subevent.resolver.ts (T010)"
Task: "Migrate encounter.resolver.ts (T011)"
```

---

## Implementation Strategy

### MVP (Full feature — single user story)

1. Phase 1: Confirm dataloader dep + identify all 16 call sites
2. Phase 2: Create `RankingSystemLoaderService` + wire into `RankingModule`
3. Phase 3: Migrate all 16 call sites + update tests
4. Phase 4: Lint + build verification

This feature has one user story. Full implementation = MVP.
