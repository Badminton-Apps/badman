# Tasks: DataLoader for RankingPoint.player field resolver

**Input**: Design documents from `specs/022-dataloader-ranking-point-player/`
**Branch**: `022-dataloader-ranking-point-player`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓
**Pre-condition gate**: Sentry N+1 alert on `RankingPoint.player` OR documented hot-path test result — document before starting Phase 3.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create `loaders/` directory; confirm dataloader dependency.

- [ ] T001 Confirm `dataloader` v2 in `package.json` (feature 019 prerequisite)
- [ ] T002 Create directory `libs/backend/graphql/src/loaders/` (new shared loader location)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create `PlayerLoaderService` and register it in the GraphQL module. Shared by features 023 and 026.

**⚠️ CRITICAL**: Features 023 and 026 depend on this service existing.

- [ ] T003 Create `libs/backend/graphql/src/loaders/player-loader.service.ts` with `@Injectable({ scope: Scope.REQUEST })`, `DataLoader<string, Player | null>` field, null-guard `load(id)` method, and batch fn: `Player.findAll({ where: { id: { [Op.in]: keys } } })` → map to input-key order with `null` for missing ids
- [ ] T004 Add `PlayerLoaderService` to `providers` and `exports` in `libs/backend/graphql/src/graphql.module.ts` (or create `libs/backend/graphql/src/loaders/loaders.module.ts` and import it into `GraphqlModule`)
- [ ] T005 Export `PlayerLoaderService` from `libs/backend/graphql/src/loaders/index.ts` (barrel export)

**Checkpoint**: `nx build backend-graphql` passes — `PlayerLoaderService` compiles and is importable.

---

## Phase 3: User Story 1 — Ranking points list resolves players in one query (Priority: P1) 🎯 MVP

**Goal**: `RankingPointResolver.player` uses `PlayerLoaderService.load(playerId)` instead of `rankingPoint.getPlayer()`. N Player DB lookups → 1 per request.

**Independent Test**: Spy on `PlayerLoaderService.load` in a unit test returning 10 `RankingPoint` rows. Assert spy called 10 times but `Player.findAll` called exactly once.

### Implementation for User Story 1

- [ ] T006 [US1] Inject `PlayerLoaderService` into `RankingPointResolver` constructor and replace `rankingPoint.getPlayer()` with `this.playerLoader.load(rankingPoint.playerId)` at line ~42–44 in `libs/backend/graphql/src/resolvers/ranking/rankingPoint.resolver.ts`
- [ ] T007 [US1] Update `libs/backend/graphql/src/resolvers/ranking/rankingPoint.resolver.spec.ts`: replace `getPlayer` spy with `PlayerLoaderService.load` spy; assert `Player.findAll` called once for 10-row result; add test for null `playerId` returns null
- [ ] T008 [US1] Run `nx test backend-graphql --testFile=rankingPoint.resolver.spec.ts`; confirm all tests pass

**Checkpoint**: `RankingPointResolver.player` uses loader. Tests confirm 1 `Player.findAll` call for N rows.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [ ] T009 Run full `nx test backend-graphql`; confirm no regressions
- [ ] T010 [P] Run `nx lint backend-graphql`; fix any warnings
- [ ] T011 [P] Run `nx build backend-graphql --skip-nx-cache`; confirm zero TypeScript errors

---

## Dependencies & Execution Order

- **Phase 1 (T001–T002)**: Start immediately
- **Phase 2 (T003–T005)**: Depends on Phase 1 — blocks Phase 3 AND features 023/026
- **Phase 3 (T006–T008)**: Depends on Phase 2
- **Phase 4**: Depends on Phase 3

### Note on downstream features

`PlayerLoaderService` created here is reused by:
- Feature 023 (`LastRankingPlaceResolver.player`)
- Feature 026 (`CommentResolver.player`)

Merge this branch before starting 023 or 026, or implement in one combined PR.

---

## Implementation Strategy

### MVP

1. Phase 1: Setup
2. Phase 2: Create `PlayerLoaderService` (shared foundation for 022, 023, 026)
3. Phase 3: Wire into `RankingPointResolver`
4. Phase 4: Verify

Pre-condition gate must be met before shipping (Sentry alert or hot-path test documented in plan.md).
