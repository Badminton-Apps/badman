# Tasks: Resolver Test Coverage

**Input**: Design documents from `specs/032-resolver-test-coverage/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅

**Organization**: Tasks grouped by user story to enable independent implementation and parallel execution.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Configure jest to support coverage reporting and integration test exclusion in `backend-graphql`.

- [ ] T001 Update `libs/backend/graphql/jest.config.ts` — add `coverageReporters: ['text', 'lcov']`, `coverageThreshold` (all metrics at 0% placeholder), and `testPathIgnorePatterns: ['\\.integration\\.spec\\.ts$']`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Wire the coverage command so US7 verification and CI integration are unblocked.

**⚠️ CRITICAL**: US7 verification cannot begin until this phase is complete.

- [ ] T002 Update `package.json` — add `"test:coverage:all"` script: `nx run-many --target=test --all --coverage --skip-nx-cache --exclude=badman,frontend-models,frontend-components,frontend-html-injects,frontend-vitals,frontend-translation,frontend-auth,frontend-excel,frontend-pdf,frontend-utils,frontend-graphql,frontend-queue,frontend-cp,frontend-twizzit,frontend-seo,frontend-club,frontend-ranking,frontend-role,frontend-general,frontend-tournament,frontend-transfers,frontend-team,frontend-job,frontend-rule,frontend-team-assembly,frontend-change-encounter,frontend-team-enrollment,frontend-event,frontend-notifications,frontend-player`

**Checkpoint**: Foundation ready — coverage command available, resolver spec phases can proceed in parallel.

---

## Phase 3: User Story 7 — Coverage Command (Priority: P1)

**Goal**: A single `npm run test:coverage:all` command runs all non-legacy tests with lcov output and exits non-zero below threshold.

**Independent Test**: Run `npm run test:coverage:all` and confirm: (a) exits 0, (b) text summary printed to console, (c) `coverage/libs/backend/graphql/lcov.info` exists, (d) no paths containing `apps/badman` or `libs/frontend` appear.

- [ ] T003 [US7] Verify `npm run test:coverage:all` runs cleanly against the existing test suite — confirm text summary appears, lcov files are written to `coverage/`, and no Angular/frontend paths appear. Document any unexpected failures in `specs/032-resolver-test-coverage/audit.md` under a "Setup issues" note.

**Checkpoint**: Coverage command verified working end-to-end.

---

## Phase 4: User Story 1 — Security Resolvers (Priority: P1)

**Goal**: `claim.resolver.spec.ts` and `role.resolver.spec.ts` exist with full contract-first coverage.

**Independent Test**: `nx test backend-graphql --testPathPattern="claim|role"` passes. Both unauthorized and authorized mutation paths are verified. Field resolvers `players` and `claims` on role are covered.

**Reference pattern**: `libs/backend/graphql/src/resolvers/setting/setting.resolver.spec.ts`  
**DI group**: Group A (Sequelize only) for both resolvers.  
**Stub pattern**: `{ provide: Sequelize, useValue: { transaction: jest.fn().mockResolvedValue(mockTransaction) } }`

- [ ] T004 [P] [US1] Write `libs/backend/graphql/src/resolvers/security/claim.resolver.spec.ts` — cover: `claim` query (returns data / null), `claims` list query, `assignClaim` unauthorized → UnauthorizedException, `assignClaim` success → commit, `assignClaims` unauthorized → UnauthorizedException, `assignClaims` success → commit
- [ ] T005 [P] [US1] Write `libs/backend/graphql/src/resolvers/security/role.resolver.spec.ts` — cover: `role` query (returns data / null), `roles` list query, `createRole` / `updateRole` / `deleteRole` unauthorized → UnauthorizedException, `createRole` success → commit, `updateRole` not-found → NotFoundException, `updateRole` success → commit, `deleteRole` not-found → NotFoundException, `deleteRole` success → commit, `addPlayerToRole` / `removePlayerFromRole` / `updateRolePlayers` unauthorized → UnauthorizedException + success paths, `players` ResolveField returns array, `claims` ResolveField returns array

**Checkpoint**: Security resolvers fully tested. `nx test backend-graphql --testPathPattern="claim|role"` passes.

---

## Phase 5: User Story 2 — Event Resolvers (Priority: P2)

**Goal**: Four event resolver spec files (competition event, tournament draw, tournament event, tournament subevent) fully tested.

**Independent Test**: `nx test backend-graphql --testPathPattern="event\.resolver|draw\.resolver|subevent\.resolver"` passes.

**DI group**: Group D (Sequelize + PointsService + `getQueueToken(SyncQueue)` + RankingSystemService) for all four.  
**Bull queue stub**: `{ provide: getQueueToken(SyncQueue), useValue: { add: jest.fn() } }` (import `getQueueToken` from `@nestjs/bull`, `SyncQueue` from `@badman/backend-queue`).

- [ ] T006 [P] [US2] Write `libs/backend/graphql/src/resolvers/event/competition/event.resolver.spec.ts` — cover: `eventCompetition` query (by id / null), `eventCompetitions` paged query, `eventCompetitionSeasons` list, `updateEventCompetition` unauthorized → UnauthorizedException / success → commit / rollback on error, `copyEventCompetition` unauthorized / success, `subEventCompetitions` ResolveField, `comments` ResolveField, `exceptions` ResolveField, `infoEvents` ResolveField
- [ ] T007 [P] [US2] Write `libs/backend/graphql/src/resolvers/event/tournament/draw.resolver.spec.ts` — cover: `drawTournament` query (by id / null), `drawTournaments` list, `recalculateDrawTournamentRankingPoints` unauthorized / success → queue.add called, `syncDraw` unauthorized / success → queue.add called, `subEventTournament` ResolveField, `eventEntries` ResolveField, `games` ResolveField
- [ ] T008 [P] [US2] Write `libs/backend/graphql/src/resolvers/event/tournament/event.resolver.spec.ts` — cover: `eventTournament` query (by id / null), `eventTournaments` paged query, `updateEventTournament` unauthorized / success → commit / rollback, `removeEventTournament` unauthorized / not-found → NotFoundException / success, `recalculateEventTournamentRankingPoints` unauthorized / success → queue.add called, `syncEvent` unauthorized / success → queue.add called, `subEventTournaments` ResolveField
- [ ] T009 [P] [US2] Write `libs/backend/graphql/src/resolvers/event/tournament/subevent.resolver.spec.ts` — cover: `subEventTournament` query (by id / null), `subEventTournaments` list, `recalculateSubEventTournamentwRankingPoints` unauthorized / success → queue.add called, `syncSubEvent` unauthorized / success → queue.add called, `drawTournaments` ResolveField, `eventTournament` ResolveField, `rankingGroups` ResolveField

**Checkpoint**: Event resolvers fully tested. `nx test backend-graphql --testPathPattern="event\.resolver|draw\.resolver|subevent\.resolver"` passes.

---

## Phase 6: User Story 3 — Encounter-Change Resolver (Priority: P2)

**Goal**: `encounter-change.resolver.spec.ts` exists with full coverage including the complex multi-service dependencies.

**Independent Test**: `nx test backend-graphql --testPathPattern="encounter-change"` passes.

**DI group**: Group F — Sequelize + `getQueueToken(SyncQueue)` + NotificationService stub + EncounterValidationService stub.

- [ ] T010 [US3] Write `libs/backend/graphql/src/resolvers/event/competition/encounter-change.resolver.spec.ts` — cover: `encounterChange` query (by id / null), `encounterChanges` paged query, `addChangeEncounter` unauthorized → UnauthorizedException / success → commit / rollback on error, `updateEncounterChange` unauthorized / success → commit / rollback, `dates` ResolveField on EncounterChange returns array, `dates` ResolveField on EncounterChangeDate returns Location

**Checkpoint**: Encounter-change resolver fully tested.

---

## Phase 7: User Story 4 — Availability, FAQ, Notification, CronJob, Service (Priority: P3)

**Goal**: Five resolver spec files exist for lower-criticality but commonly used resolvers.

**Independent Test**: `nx test backend-graphql --testPathPattern="availability|faq|notification|cronJob|service"` passes.

**DI groups**: availability/faq/notification → Group A (Sequelize only); cronJob → Group C (Sequelize + CronService); service → Group B (no DI).

- [ ] T011 [P] [US4] Write `libs/backend/graphql/src/resolvers/availability/availability.resolver.spec.ts` — cover: `availability` query (by id / null), `availabilities` list, `createAvailability` unauthorized / success → commit / rollback, `updateAvailability` unauthorized / not-found / success → commit / rollback, `days` ResolveField (nullable), `exceptions` ResolveField (nullable)
- [ ] T012 [P] [US4] Write `libs/backend/graphql/src/resolvers/faq/faq.resolver.spec.ts` — cover: `faq` query (by id / null), `faqs` list, `createFaq` unauthorized / success → commit / rollback, `updateFaq` unauthorized / not-found → NotFoundException / success → commit / rollback, `deleteFaq` unauthorized / not-found → NotFoundException / success → commit and returns true
- [ ] T013 [P] [US4] Write `libs/backend/graphql/src/resolvers/notification/notification.resolver.spec.ts` — cover: `notification` query (by id / null), `notifications` list, `updateNotification` unauthorized / not-found / success → commit / rollback, `encounter` ResolveField, `competition` ResolveField, `tournament` ResolveField, `club` ResolveField
- [ ] T014 [P] [US4] Write `libs/backend/graphql/src/resolvers/cronJobs/cronJob.resolver.spec.ts` — cover: `cronJobs` list query, `updateCronJob` unauthorized → UnauthorizedException / success → commit / rollback, `nextRun` ResolveField returns a string, `arguments` ResolveField on CronJobMeta returns serialized string. Use `{ provide: CronService, useValue: { ... } }` stub matching the methods called in the resolver.
- [ ] T015 [P] [US4] Write `libs/backend/graphql/src/resolvers/services/service.resolver.spec.ts` — cover: `services` list returns data, `services` list returns empty array. No DI needed (no constructor). Model static `Service.findAll` spied via `jest.spyOn`.

**Checkpoint**: All P3 misc resolvers tested. `nx test backend-graphql --testPathPattern="availability|faq|notification|cronJob|service"` passes.

---

## Phase 8: User Story 5 — Assembly & RankingSystemGroup (Priority: P3)

**Goal**: `assembly.resolver.spec.ts` and `rankingSystemGroup.resolver.spec.ts` exist.

**Independent Test**: `nx test backend-graphql --testPathPattern="assembly|rankingSystemGroup"` passes.

**DI groups**: assembly → Group E (AssemblyValidationService + RankingSystemService, no Sequelize); rankingSystemGroup → Group C+ (Sequelize + PointsService).

- [ ] T016 [P] [US5] Write `libs/backend/graphql/src/resolvers/event/competition/assembly.resolver.spec.ts` — cover: `validateAssembly` query returns AssemblyOutput, `createAssembly` unauthorized → UnauthorizedException / success → commit / rollback. Note: AssemblyResolver takes no Sequelize — check constructor: uses `AssemblyValidationService` and `RankingSystemService`. `titularsPlayers` ResolveField returns array, `baseTeamPlayers` ResolveField returns array.
- [ ] T017 [P] [US5] Write `libs/backend/graphql/src/resolvers/ranking/rankingSystemGroup.resolver.spec.ts` — cover: `rankingGroup` query (by id / null), `rankingGroups` list, `addSubEventsToRankingGroup` unauthorized / success → commit / rollback, `removeSubEventsToRankingGroup` unauthorized / success → commit / rollback, `subEventCompetitions` ResolveField, `subEventTournaments` ResolveField

**Checkpoint**: Assembly and RankingSystemGroup resolvers tested.

---

## Phase 9: User Story 6 — Club Membership Resolver (Priority: P3)

**Goal**: `club-membership.resolver.spec.ts` covers the read-only query and both ResolveField associations.

**Independent Test**: `nx test backend-graphql --testPathPattern="club-membership"` passes.

**DI group**: Group B (no constructor, no DI — `ClubPlayerMembershipsResolver` has no injected dependencies). Model statics spied via `jest.spyOn`.

- [ ] T018 [US6] Write `libs/backend/graphql/src/resolvers/club/club-membership.resolver.spec.ts` — cover: `clubPlayerMemberships` query returns paged result (`{ count, rows }`), `clubPlayerMemberships` returns empty result when no memberships, `club` ResolveField returns associated Club, `player` ResolveField returns associated Player. No Sequelize in TestingModule providers.

**Checkpoint**: All 15 resolver spec files written. `nx test backend-graphql` passes.

---

## Phase 10: User Story 8 — Resolver Audit Report (Priority: P2)

**Goal**: `specs/032-resolver-test-coverage/audit.md` committed — covers all 33 resolvers with findings by category.

**Independent Test**: File `specs/032-resolver-test-coverage/audit.md` exists, contains a summary table with `missing-auth` / `duplication` / `performance` / `code-quality` / `bug` / `missing-idempotency` rows, and each finding has file path + line reference + suggested remedy.

**Prerequisite**: All 15 resolver spec files must be complete (Phases 4–9 done). The audit is a second pass that reads the actual implementations. US8 is sequenced here despite its P2 priority because the audit requires all spec files to exist first — it cannot run alongside Phases 4–9.

- [ ] T019 [US8] Produce `specs/032-resolver-test-coverage/audit.md` — read all 33 resolver implementations (`libs/backend/graphql/src/resolvers/**/*.resolver.ts`). For each resolver, check: (1) write mutations without `user.hasAnyPermission()` → `missing-auth`; (2) near-identical logic duplicated across resolvers → `duplication`; (3) field resolvers issuing N queries instead of using existing dataloader pattern → `performance`; (4) structural code quality issues (inconsistent error handling, dead code, missing Logger calls on errors) → `code-quality`; (5) any bugs found during spec-writing that were documented as findings → `bug`; (6) create mutations with a natural uniqueness key that are NOT idempotent (do not return `alreadyExisted: boolean`) → `missing-idempotency` (Constitution Principle III violation). Apply the trivial-fix rule: ≤5 lines, one method, no model/schema change → fix in place and mark `fixed`; else mark `deferred` with a placeholder link.

**Checkpoint**: Audit committed. All findings categorized and linked.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Pin coverage threshold, validate end-to-end, update docs.

- [ ] T020 Run `npm run test:coverage:all` after all resolver specs are written — record the `Lines %` for `backend-graphql` from the console output, round down to nearest 5%, update `coverageThreshold.global` in `libs/backend/graphql/jest.config.ts` with the measured values, and commit
- [ ] T021 [P] Verify `AGENTS.md` coverage threshold update instructions are accurate and match the actual location of `coverageThreshold` in `libs/backend/graphql/jest.config.ts` — adjust wording if needed
- [ ] T021b [P] Update `README.md` — add `test:coverage:all` command to the testing section and document how to update the coverage threshold (same instructions as AGENTS.md: run command → note Lines % → round down to nearest 5% → update `coverageThreshold.global` in `libs/backend/graphql/jest.config.ts` → commit)
- [ ] T022 [P] Second-pass review of the four complex resolver specs (encounter-change, competition/event, rankingSystemGroup, assembly) — read each resolver implementation and add any missing edge-case tests that behavioral contract-first testing did not surface (e.g. internal branching on `IsUUID`, idempotency guards, error re-throw paths). Document any implementation bugs found per FR-009.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: After Phase 1
- **Phase 3 (US7)**: After Phase 2 — verifies the coverage command
- **Phases 4–9 (US1–US6)**: All can run in parallel after Phase 2; no cross-story dependencies
- **Phase 10 (US8 Audit)**: After Phases 4–9 complete (needs all specs written)
- **Phase 11 (Polish)**: After Phase 10 complete

### User Story Dependencies

- **US7 (P1)**: Phase 2 complete → can verify immediately
- **US1 (P1)**: Phase 2 complete → T004, T005 in parallel
- **US2 (P2)**: Phase 2 complete → T006, T007, T008, T009 in parallel
- **US3 (P2)**: Phase 2 complete → T010
- **US4 (P3)**: Phase 2 complete → T011, T012, T013, T014, T015 in parallel
- **US5 (P3)**: Phase 2 complete → T016, T017 in parallel
- **US6 (P3)**: Phase 2 complete → T018
- **US8 (P2)**: Phases 4–9 complete → T019
- **Polish**: All above complete → T020, T021, T021b, T022

### Parallel Opportunities

Within each phase, tasks marked `[P]` can run simultaneously (different files). Phase 3 (US7) through Phase 9 (US6) can all run in parallel once Phase 2 completes — except US8 which waits for all specs.

---

## Parallel Example: Phases 4–9 (after Phase 2 completes)

```text
Parallel batch — all start simultaneously:
  T004  [US1] claim.resolver.spec.ts
  T005  [US1] role.resolver.spec.ts
  T006  [US2] event/competition/event.resolver.spec.ts
  T007  [US2] event/tournament/draw.resolver.spec.ts
  T008  [US2] event/tournament/event.resolver.spec.ts
  T009  [US2] event/tournament/subevent.resolver.spec.ts
  T010  [US3] encounter-change.resolver.spec.ts
  T011  [US4] availability.resolver.spec.ts
  T012  [US4] faq.resolver.spec.ts
  T013  [US4] notification.resolver.spec.ts
  T014  [US4] cronJob.resolver.spec.ts
  T015  [US4] service.resolver.spec.ts
  T016  [US5] assembly.resolver.spec.ts
  T017  [US5] rankingSystemGroup.resolver.spec.ts
  T018  [US6] club-membership.resolver.spec.ts

After all 15 complete:
  T019  [US8] audit.md

After T019:
  T020, T021, T022  (Polish — T021 and T022 parallel)
```

---

## Implementation Strategy

### MVP First (US7 + US1)

1. Phase 1: Configure jest (T001)
2. Phase 2: Add npm script (T002)
3. Phase 3: Verify coverage command (T003)
4. Phase 4: Write claim + role specs (T004, T005)
5. **STOP and VALIDATE**: `npm run test:coverage:all` passes, security resolvers green

### Full Delivery

1. Phases 1–2: Setup
2. Phase 3: Verify command
3. Phases 4–9 in parallel: All 15 resolver specs
4. Phase 10: Audit
5. Phase 11: Pin threshold, second pass, docs

---

## Notes

- All resolver specs follow the pattern in `libs/backend/graphql/src/resolvers/setting/setting.resolver.spec.ts`
- DI stubs per resolver: see `specs/032-resolver-test-coverage/data-model.md` (provider map table)
- Bull queue injection: `{ provide: getQueueToken(SyncQueue), useValue: { add: jest.fn() } }` from `@nestjs/bull` / `@badman/backend-queue`
- Write tests from the method signature and GraphQL contract FIRST. Only consult implementation if a test unexpectedly fails.
- `assembly.resolver.ts` has NO Sequelize constructor arg — do not add it to TestingModule
- `club-membership.resolver.ts` and `service.resolver.ts` have NO constructor — providers list contains only the resolver class itself
- Trivial fix rule (FR-009): ≤5 lines, one method, no model/schema change → fix allowed in same PR
