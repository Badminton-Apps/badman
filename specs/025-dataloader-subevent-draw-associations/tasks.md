# Tasks: DataLoader for SubEvent / DrawCompetition / EventEntry parent FK associations

**Input**: Design documents from `specs/025-dataloader-subevent-draw-associations/`
**Branch**: `025-dataloader-subevent-draw-associations`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓
**Pre-condition gate**: Sentry N+1 alert on SubEvent.eventCompetition, DrawCompetition.subEventCompetition, or EventEntry.subEventCompetition OR documented hot-path test — document before starting Phase 3.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm `loaders/` directory exists; confirm dataloader dep.

- [ ] T001 Confirm `libs/backend/graphql/src/loaders/` directory exists
- [ ] T002 Confirm `dataloader` v2 in `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create `EventCompetitionLoaderService` and `SubEventCompetitionLoaderService`; register in module.

**⚠️ CRITICAL**: All three resolver migrations depend on these services.

- [ ] T003 [P] Create `libs/backend/graphql/src/loaders/event-competition-loader.service.ts` with `@Injectable({ scope: Scope.REQUEST })`, null-guard `load(id)` method, and batch fn: `EventCompetition.findAll({ where: { id: { [Op.in]: keys } } })` → results in input-key order with `null` for missing ids
- [ ] T004 [P] Create `libs/backend/graphql/src/loaders/sub-event-competition-loader.service.ts` with same structure for `SubEventCompetition.findAll`
- [ ] T005 Add `EventCompetitionLoaderService` and `SubEventCompetitionLoaderService` to `providers` and `exports` in `libs/backend/graphql/src/graphql.module.ts` (or `LoadersModule`)
- [ ] T006 Export both from `libs/backend/graphql/src/loaders/index.ts`

**Checkpoint**: `nx build backend-graphql` passes — both services compile and are injectable.

---

## Phase 3: User Story 1 — Competition structure page resolves parent entities in bulk (Priority: P1) 🎯 MVP

**Goal**: Three field resolvers use DataLoaders. M+K+J individual parent-entity queries → at most 2 bulk queries per request tick.

**Independent Test**: Spy on `EventCompetitionLoaderService.load` in a unit test with 8 SubEvent rows → assert `EventCompetition.findAll` called once. Spy on `SubEventCompetitionLoaderService.load` in a test with 8 DrawCompetition rows → assert `SubEventCompetition.findAll` called once.

### Implementation for User Story 1

- [ ] T007 [P] [US1] Inject `EventCompetitionLoaderService` into `SubEventCompetitionResolver` constructor and replace `subEvent.getEventCompetition()` with `this.eventCompetitionLoader.load(subEvent.eventCompetitionId)` at ~line 61–63 in `libs/backend/graphql/src/resolvers/event/competition/subevent.resolver.ts`
- [ ] T008 [P] [US1] Inject `SubEventCompetitionLoaderService` into `DrawCompetitionResolver` constructor and replace `draw.getSubEventCompetition()` with `this.subEventLoader.load(draw.subEventCompetitionId)` in `libs/backend/graphql/src/resolvers/event/competition/draw.resolver.ts`
- [ ] T009 [P] [US1] Inject `SubEventCompetitionLoaderService` into `EventEntryResolver` constructor and replace `eventEntry.getSubEventCompetition()` with `this.subEventLoader.load(eventEntry.subEventCompetitionId)` at ~line 61–63 in `libs/backend/graphql/src/resolvers/event/entry.resolver.ts`
- [ ] T010 [US1] Update `libs/backend/graphql/src/resolvers/event/competition/subevent.resolver.spec.ts`: replace `getEventCompetition` spy with `EventCompetitionLoaderService.load` spy; add null FK test
- [ ] T011 [US1] Update spec file for `DrawCompetitionResolver`: replace `getSubEventCompetition` spy with `SubEventCompetitionLoaderService.load` spy
- [ ] T012 [US1] Update spec file for `EventEntryResolver`: replace `getSubEventCompetition` spy with `SubEventCompetitionLoaderService.load` spy; add null FK test
- [ ] T013 [US1] Run `nx test backend-graphql` for the three affected spec files; confirm all pass

**Checkpoint**: All three field resolvers use loaders. Tests confirm single bulk query per entity type.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [ ] T014 Run full `nx test backend-graphql`; confirm no regressions
- [ ] T015 [P] Run `nx lint backend-graphql`; fix any warnings
- [ ] T016 [P] Run `nx build backend-graphql --skip-nx-cache`; confirm zero TypeScript errors

---

## Dependencies & Execution Order

- **Phase 1 (T001–T002)**: Start immediately
- **Phase 2 (T003–T006)**: T003+T004 in parallel; T005+T006 after both compile
- **Phase 3 (T007–T013)**: T007, T008, T009 in parallel after Phase 2; T010–T012 after respective resolver changes
- **Phase 4**: After Phase 3

### Parallel Example: Phase 3 resolver migrations

```bash
# Run T007, T008, T009 in parallel (different files):
Task: "Migrate subevent.resolver.ts (T007)"
Task: "Migrate draw.resolver.ts (T008)"
Task: "Migrate entry.resolver.ts (T009)"
```

---

## Implementation Strategy

### MVP

1. Phase 1: Setup
2. Phase 2: Create both loader services in parallel
3. Phase 3: Migrate 3 resolver files in parallel, update specs
4. Phase 4: Full test + lint + build

Note: `SubEventCompetitionLoaderService` created here is shared across DrawCompetition and EventEntry resolvers within the same request — cross-resolver dedup is automatic via Scope.REQUEST.
