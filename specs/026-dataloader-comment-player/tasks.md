# Tasks: DataLoader for Comment.player field resolver

**Input**: Design documents from `specs/026-dataloader-comment-player/`
**Branch**: `026-dataloader-comment-player`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓
**Pre-condition gate**: Sentry N+1 alert on `Comment.player` resolver OR documented hot-path test — document before starting Phase 3.
**Dependency**: Feature 022 (`PlayerLoaderService`) should be merged first.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm PlayerLoaderService availability.

- [ ] T001 Check if `libs/backend/graphql/src/loaders/player-loader.service.ts` exists (feature 022 merged). If YES → proceed to Phase 3. If NO → complete Phase 2.

---

## Phase 2: Foundational (Only if feature 022 not yet merged)

**Purpose**: Create `PlayerLoaderService` if 022 has not been merged. Skip if service already exists.

- [ ] T002 Create `libs/backend/graphql/src/loaders/player-loader.service.ts` with `@Injectable({ scope: Scope.REQUEST })`, null-guard `load(id)` method, and batch fn: `Player.findAll({ where: { id: { [Op.in]: keys } } })` → results in input-key order with `null` for missing ids
- [ ] T003 Add `PlayerLoaderService` to `providers` and `exports` in `libs/backend/graphql/src/graphql.module.ts` (or `LoadersModule`)
- [ ] T004 Export `PlayerLoaderService` from `libs/backend/graphql/src/loaders/index.ts`

---

## Phase 3: User Story 1 — Comment list resolves author players in one query (Priority: P1) 🎯 MVP

**Goal**: `CommentResolver.player` uses `PlayerLoaderService.load(comment.playerId)` instead of `comment.getPlayer()`. N Player DB lookups → 1 per request.

**Independent Test**: Spy on `PlayerLoaderService.load` in a unit test returning 8 `Comment` rows. Assert `Player.findAll` called exactly once.

### Implementation for User Story 1

- [ ] T005 [US1] Inject `PlayerLoaderService` into `CommentResolver` constructor and replace `comment.getPlayer()` with `this.playerLoader.load(comment.playerId)` at line ~46–49 in `libs/backend/graphql/src/resolvers/comment/comment.resolver.ts`
- [ ] T006 [US1] Update `libs/backend/graphql/src/resolvers/comment/comment.resolver.spec.ts`: replace `getPlayer` spy with `PlayerLoaderService.load` spy; assert `Player.findAll` called once for 8-row result; add test for null `playerId` (anonymous comment) returns null
- [ ] T007 [US1] Run `nx test backend-graphql --testFile=comment.resolver.spec.ts`; confirm all tests pass

**Checkpoint**: `CommentResolver.player` uses loader. Tests confirm 1 `Player.findAll` for N rows.

---

## Phase 4: Bonus — EntryCompetitionPlayersResolver.player (optional, same PR)

**Pre-condition**: Same Sentry/hot-path signal as Phase 3 OR explicit decision to bundle.

- [ ] T008 [P] [US1] Inject `PlayerLoaderService` into `EntryCompetitionPlayersResolver` and replace `Player.findByPk(eventEntryPlayer.id)` with `this.playerLoader.load(eventEntryPlayer.id)` at line ~190–193 in `libs/backend/graphql/src/resolvers/event/entry.resolver.ts`
- [ ] T009 [US1] Update spec for `EntryCompetitionPlayersResolver` to spy on `PlayerLoaderService.load` instead of `Player.findByPk`

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T010 Run full `nx test backend-graphql`; confirm no regressions
- [ ] T011 [P] Run `nx lint backend-graphql`; fix any warnings
- [ ] T012 [P] Verify no duplicate `PlayerLoaderService` class: `grep -rn "class PlayerLoaderService" libs/backend/graphql/src/ --include="*.ts"`

---

## Dependencies & Execution Order

- **Phase 1 (T001)**: Start immediately
- **Phase 2 (T002–T004)**: Only if 022 not merged
- **Phase 3 (T005–T007)**: Depends on PlayerLoaderService available
- **Phase 4 (T008–T009)**: Optional; can run in parallel with Phase 3
- **Phase 5**: After Phase 3 (and Phase 4 if included)

---

## Implementation Strategy

If feature 022 merged: Phase 1 check + Phase 3 = 3 tasks, ~15 minutes.

Optional Phase 4 bundles `EntryCompetitionPlayersResolver.player` into the same PR for zero extra cost — same injection pattern, same loader, adjacent file.
