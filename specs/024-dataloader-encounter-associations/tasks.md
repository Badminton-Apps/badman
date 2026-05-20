# Tasks: DataLoader for EncounterCompetition home/away/drawCompetition associations

**Input**: Design documents from `specs/024-dataloader-encounter-associations/`
**Branch**: `024-dataloader-encounter-associations`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓
**Pre-condition gate**: Sentry N+1 alert on encounter association resolvers OR documented hot-path test for a large draw — document before starting Phase 3.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm `loaders/` directory exists (created by 022 or create here).

- [ ] T001 Confirm `libs/backend/graphql/src/loaders/` directory exists; create if not (feature 022 should have created it)
- [ ] T002 Confirm `dataloader` v2 in `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create `TeamLoaderService` and `DrawCompetitionLoaderService`; register in module.

**⚠️ CRITICAL**: Both services must be available before `encounter.resolver.ts` is modified.

- [ ] T003 [P] Create `libs/backend/graphql/src/loaders/team-loader.service.ts` with `@Injectable({ scope: Scope.REQUEST })`, null-guard `load(id)` method, and batch fn: `Team.findAll({ where: { id: { [Op.in]: keys } } })` → results in input-key order with `null` for missing ids
- [ ] T004 [P] Create `libs/backend/graphql/src/loaders/draw-competition-loader.service.ts` with same structure as above but for `DrawCompetition.findAll`
- [ ] T005 Add `TeamLoaderService` and `DrawCompetitionLoaderService` to `providers` and `exports` in `libs/backend/graphql/src/graphql.module.ts` (or `LoadersModule`)
- [ ] T006 Export both services from `libs/backend/graphql/src/loaders/index.ts`

**Checkpoint**: `nx build backend-graphql` passes — both services compile and are injectable.

---

## Phase 3: User Story 1 — Draw encounters resolve home/away teams and draw in bulk (Priority: P1) 🎯 MVP

**Goal**: `EncounterCompetitionResolver.home/away/drawCompetition` use loaders. For a draw with N encounters: Team DB lookups 2N→1; DrawCompetition lookups N→1.

**Independent Test**: Spy on `TeamLoaderService.load` and `DrawCompetitionLoaderService.load` in a unit test with 10 encounters. Assert `Team.findAll` called once (covers both home+away ids) and `DrawCompetition.findAll` called once.

### Implementation for User Story 1

- [ ] T007 [US1] Inject `TeamLoaderService` and `DrawCompetitionLoaderService` into `EncounterCompetitionResolver` constructor in `libs/backend/graphql/src/resolvers/event/competition/encounter.resolver.ts`
- [ ] T008 [US1] Replace `encounter.getHome()` with `this.teamLoader.load(encounter.homeTeamId)` in `home` field resolver (~line 302–313) in `libs/backend/graphql/src/resolvers/event/competition/encounter.resolver.ts`
- [ ] T009 [US1] Replace `encounter.getAway()` with `this.teamLoader.load(encounter.awayTeamId)` in `away` field resolver (~line 315–326) in `libs/backend/graphql/src/resolvers/event/competition/encounter.resolver.ts`
- [ ] T010 [US1] Replace `encounter.getDrawCompetition()` with `this.drawLoader.load(encounter.drawId)` in `drawCompetition` field resolver (~line 274–287) in `libs/backend/graphql/src/resolvers/event/competition/encounter.resolver.ts`
- [ ] T011 [US1] Update `libs/backend/graphql/src/resolvers/event/competition/encounter.resolver.spec.ts`: replace `getHome`/`getAway`/`getDrawCompetition` spies with `TeamLoaderService.load` / `DrawCompetitionLoaderService.load` spies; add test for null `homeTeamId`/`awayTeamId` returns null
- [ ] T012 [US1] Run `nx test backend-graphql --testFile=encounter.resolver.spec.ts`; confirm all tests pass

**Checkpoint**: All 3 field resolvers use loaders. Tests confirm batch consolidation.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [ ] T013 Run full `nx test backend-graphql`; confirm no regressions
- [ ] T014 [P] Run `nx lint backend-graphql`; fix any warnings
- [ ] T015 [P] Run `nx build backend-graphql --skip-nx-cache`; confirm zero TypeScript errors

---

## Dependencies & Execution Order

- **Phase 1 (T001–T002)**: Start immediately
- **Phase 2 (T003–T006)**: T003 and T004 in parallel; T005 and T006 after both
- **Phase 3 (T007–T012)**: T007 first; T008–T010 can run in parallel after T007; T011 after T008–T010
- **Phase 4**: After Phase 3

### Parallel Example: Phase 2 service creation

```bash
# Run T003 and T004 in parallel:
Task: "Create team-loader.service.ts"
Task: "Create draw-competition-loader.service.ts"
```

---

## Implementation Strategy

### MVP

1. Phase 1: Confirm setup
2. Phase 2: Create both loader services (T003+T004 in parallel)
3. Phase 3: Wire into encounter resolver, update tests
4. Phase 4: Full verification

Note: `DrawCompetitionLoaderService` created here may be reused by feature 025 (`DrawCompetition.subEventCompetition` field). Consider exporting it broadly.
