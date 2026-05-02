---
description: "Tasks for feature 006-unify-base-index-backend"
---

# Tasks: Unify Base-Index Calculation in the Backend

**Input**: Design documents from `/specs/006-unify-base-index-backend/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/calculate-index.graphql

**Tests**: REQUIRED. The spec mandates parity tests at every layer (FR-016a/b/c, SC-005, SC-006). The helper-oracle suite ([`libs/utils/src/lib/get-index.spec.ts`](../../libs/utils/src/lib/get-index.spec.ts), 37 cases) already shipped in this branch and is referenced from later tasks.

**Organization**: Tasks are grouped by user story (4 stories: US1, US2, US3, US4 from spec.md). US2 (single canonical formula) is the foundational architectural story and runs first because US1, US3, and US4 all depend on the shared service.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- File paths shown below are absolute relative to repository root.

---

## Phase 1: Setup

**Purpose**: Verify branch precondition and prepare shared fixtures.

- [ ] T001 Verify branch state: `git branch --show-current` returns `006-unify-base-index-backend`; `libs/utils/src/lib/get-index.spec.ts` is present and passes (`npx jest --config libs/utils/jest.config.ts libs/utils/src/lib/get-index.spec.ts`).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, fixtures, and GraphQL classes that every user story consumes. **Must complete before Phase 3.**

- [ ] T002 [P] Create `libs/utils/src/lib/get-index.fixtures.ts` exporting `INDEX_CALCULATION_FIXTURES` — an array of `{ name: string; type: SubEventTypeEnum; players: Partial<IndexPlayer>[]; defaultRanking?: number; expected: number }` lifted from the 37 existing cases in `libs/utils/src/lib/get-index.spec.ts`. Re-export from `libs/utils/src/lib/index.ts`.
- [ ] T003 [P] Refactor `libs/utils/src/lib/get-index.spec.ts` to iterate `INDEX_CALCULATION_FIXTURES` from T002 instead of hand-listed cases, ensuring zero coverage regression. Run the suite — all 37 tests must still pass.
- [ ] T004 [P] Create `libs/backend/competition/enrollment/src/services/index-calculation/index-calculation.types.ts` with non-GraphQL TypeScript interfaces per [data-model.md](data-model.md): `IndexCalculationPlayerInput`, `IndexCalculationInput`, `IndexCalculationContributingPlayer`, `IndexCalculationSuccess`, `IndexCalculationFailure`, `IndexCalculationResult`, `IndexCalculationErrorCode` enum.
- [ ] T005 [P] Create `libs/backend/graphql/src/resolvers/event/competition/calculate-index/calculate-index.input.ts` with code-first `@InputType` classes: `CalculateIndexPlayerInput`, `CalculateIndexInput` per [contracts/calculate-index.graphql](contracts/calculate-index.graphql). Include `class-validator` decorators (`@IsUUID`, `@IsInt`, `@IsOptional`, `@Min`).
- [ ] T006 [P] Create `libs/backend/graphql/src/resolvers/event/competition/calculate-index/calculate-index.result.ts` with code-first `@ObjectType` classes: `CalculateIndexContributingPlayer`, `CalculateIndexResult`. All result fields are non-nullable — failures throw `GraphQLError`, there is no `error` field on the result type. Add a barrel `libs/backend/graphql/src/resolvers/event/competition/calculate-index/index.ts` re-exporting input + result + (forthcoming) resolver.

**Checkpoint**: After Phase 2 the workspace compiles (`nx run-many --target=build --projects=utils,backend-competition-enrollment,backend-graphql`) and existing tests still pass. No public surface change yet.

---

## Phase 3: User Story 2 — One canonical formula, no drift (P1) [FOUNDATIONAL FOR US1, US3, US4]

**Goal**: Stand up `IndexCalculationService` as the single backend implementation of the snapshot-fetch + formula glue. After this phase, both the future GraphQL resolver and the entry-model hook can delegate to it.

**Independent Test**: `npx jest --config libs/backend/competition/enrollment/jest.config.ts libs/backend/competition/enrollment/src/services/index-calculation` — every fixture from T002 produces a numeric result equal to `getIndexFromPlayers(type, players, defaultRanking)`. Service-level partial-failure and snapshot-dedupe tests pass.

### Implementation

- [ ] T007 [US2] Create skeleton `libs/backend/competition/enrollment/src/services/index-calculation/index-calculation.service.ts` — `@Injectable()` class with public methods `calculate(inputs: IndexCalculationInput[], options?: { transaction?: Transaction }): Promise<IndexCalculationResult[]>` and `calculateOne(input, options?): Promise<IndexCalculationResult>` (delegating to `calculate`). Inject nothing yet; method bodies throw `NotImplementedException`.
- [ ] T008 [US2] In `index-calculation.service.ts`, implement snapshot-window resolution: when `subEventCompetitionId` is provided, load `SubEventCompetition` with included `EventCompetition` (attributes `season`, `usedRankingUnit`, `usedRankingAmount`); compute `[startRanking, endRanking]` by mirroring the logic in [`libs/backend/database/src/models/event/entry.model.ts`](../../libs/backend/database/src/models/event/entry.model.ts) lines 243–264. When `subEventCompetitionId` is absent, derive the window from the input `season` plus `RankingSystem` defaults. Throw structured `IndexCalculationFailure` with code `SUB_EVENT_NOT_FOUND` when the lookup fails for that input only.
- [ ] T009 [US2] In `index-calculation.service.ts`, implement RankingPlace batch fetch: group all inputs in the batch by `(season, rankingSystemId)`, run **one** `RankingPlace.findAll({ where: { playerId: [...], systemId, rankingDate: { [Op.between]: [start, end] }, updatePossible: true }, order: [['rankingDate', 'DESC']], transaction })` per group, and collapse to a `Map<playerId, RankingPlace>` keyed on the most recent row per player (FR-018 dedupe).
- [ ] T010 [US2] In `index-calculation.service.ts`, implement per-player component fill: for each input player, the resolved `single`/`double`/`mix` is `snapshot ?? rankingSystem.amountOfLevels`. Callers never supply ranking values — the DB is the sole source of truth.
- [ ] T011 [US2] In `index-calculation.service.ts`, implement gender resolution: batch-load `Player.findAll({ where: { id: [...] }, attributes: ['id','gender'] })` for all player IDs across the batch. Callers never supply gender. When a player ID has no `Player` row (or the row has no gender), surface `IndexCalculationFailure` with code `PLAYER_NOT_FOUND` and `playerIds: [<id>]` for that single input only — do not fail siblings.
- [ ] T012 [US2] In `index-calculation.service.ts`, call `getIndexFromPlayers(input.type, resolvedPlayers, rankingSystem.amountOfLevels)` from `@badman/utils` and assemble `IndexCalculationSuccess`: `{ key, index, contributingPlayers, missingPlayerCount }`. `contributingPlayers` is `getBestPlayers(...)` output mapped to the success-shape; `missingPlayerCount = 4 - contributingPlayers.length`.
- [ ] T013 [US2] In `index-calculation.service.ts`, finalize the per-input error path: catch only the targeted exceptions (`NotFoundException`, custom guard errors) per input and return `IndexCalculationFailure`. Bubble unexpected errors via the standard NestJS pipeline (those are bugs, not data conditions).
- [ ] T014 [US2] Edit `libs/backend/competition/enrollment/src/enrollment.module.ts` to add `IndexCalculationService` to `providers` and `exports`. Edit `libs/backend/competition/enrollment/src/services/index.ts` to barrel-export the service + types.

### Tests for US2

- [ ] T015 [P] [US2] Create `libs/backend/competition/enrollment/src/services/index-calculation/index-calculation.service.spec.ts`. Use `Test.createTestingModule` with mocked `Sequelize` and `jest.spyOn` on `RankingPlace`, `RankingSystem`, `Player`, `SubEventCompetition` static finders per Constitution Principle IV. Loop `INDEX_CALCULATION_FIXTURES` from `@badman/utils`; for each fixture, stub the model statics to return ranking rows that match the fixture's per-player components, call `service.calculateOne(...)`, and assert `result.index === fixture.expected` (i.e., `=== getIndexFromPlayers(fixture.type, fixture.players, fixture.defaultRanking)`).
- [ ] T016 [P] [US2] In the same `*.spec.ts`, add a "partial failure does not fail the batch" test: pass two inputs, stub `Player.findAll` to omit the second input's player ID, assert `result[0]` is a Success and `result[1]` is a Failure with `code: 'PLAYER_NOT_FOUND'` and `playerIds` populated.
- [ ] T017 [P] [US2] In the same `*.spec.ts`, add a "snapshot dedupe" test: pass three inputs that share `(season, rankingSystemId)`; assert `RankingPlace.findAll` is called exactly once with a player-ID array containing the union of all three inputs' player IDs.

**Checkpoint**: After Phase 3, US2 is independently complete. The service is wired and tested. US1 and US4 can now proceed in any order.

---

## Phase 4: User Story 1 — Club admin sees an index value that always matches the backend (P1)

**Goal**: Expose `IndexCalculationService` through the public GraphQL surface as a batched, authenticated query with per-input results.

**Independent Test**: `npx jest --config libs/backend/graphql/jest.config.ts libs/backend/graphql/src/resolvers/event/competition/calculate-index` — every fixture from T002 returns the helper-oracle number through the resolver path. Auth, batch-validation, and per-input error tests pass. Quickstart smoke tests 1, 2, 3, and 5 produce the expected outputs against a running API.

### Implementation

- [ ] T018 [US1] Create `libs/backend/graphql/src/resolvers/event/competition/calculate-index/calculate-index.resolver.ts` — `@Resolver(() => CalculateIndexResult)` class injecting `IndexCalculationService`.
- [ ] T019 [US1] In `calculate-index.resolver.ts`, implement `@Query(() => [CalculateIndexResult]) async calculateIndex(@Args({ name: 'inputs', type: () => [CalculateIndexInput] }) inputs, @User() user)`. Map the GraphQL `CalculateIndexInput[]` to `IndexCalculationInput[]` and call `service.calculate(inputs, {})`.
- [ ] T020 [US1] In `calculate-index.resolver.ts`, add resolver-level pre-validation that throws `GraphQLError` with `extensions.code = BAD_USER_INPUT` for the whole batch on: (a) empty `inputs` array, (b) any duplicate `key` within the batch, (c) malformed UUID in `subEventCompetitionId` or any player `id` (use `IsUUID` helper from `@badman/utils`), (d) `season` outside `[1990, currentYear + 1]`. There is no `rankingSystemId` — it is resolved internally.
- [ ] T021 [US1] In `calculate-index.resolver.ts`, enforce authentication: if `user?.id` is absent, throw `GraphQLError` with `extensions.code = UNAUTHENTICATED` per FR-006a. Use `ErrorCode.UNAUTHENTICATED` from `libs/backend/graphql/src/utils/error-codes.ts`.
- [ ] T022 [US1] In `calculate-index.resolver.ts`, map the service's `IndexCalculationSuccess | IndexCalculationFailure` discriminated union to the GraphQL response: when Success, return a `CalculateIndexResult` with all fields populated; when Failure, throw `GraphQLError` with the appropriate `extensions.code` (mapped via `mapErrorCode`). All `CalculateIndexResult` fields are non-nullable — there is no `error` field on the result type.
- [ ] T023 [US1] Register the resolver: edit `libs/backend/graphql/src/resolvers/event/competition/index.ts` to barrel-export `CalculateIndexResolver`; edit the parent module's `providers` list (typically `libs/backend/graphql/src/grapqhl.module.ts` or wherever resolvers in `event/competition/` are wired today — match the registration pattern of `EnrollmentResolver`).

### Tests for US1

- [ ] T024 [P] [US1] Create `libs/backend/graphql/src/resolvers/event/competition/calculate-index/calculate-index.resolver.spec.ts` per Constitution Principle IV: `Test.createTestingModule` with the resolver + a mocked `IndexCalculationService` (jest.fn for `calculate`); fake `Player` with `hasAnyPermission` jest.fn(); `afterEach(jest.restoreAllMocks)`. Cases: (a) authenticated success — service returns `IndexCalculationSuccess`, resolver returns the correctly-shaped `CalculateIndexResult`; (a-err) service returns `IndexCalculationFailure` → resolver throws `GraphQLError` with `PLAYER_NOT_FOUND`; (b) anonymous user → `GraphQLError` with `UNAUTHENTICATED`; (c) empty `inputs` → `GraphQLError` with `BAD_USER_INPUT`; (d) duplicate `key` within batch → `GraphQLError` with `BAD_USER_INPUT`; (e) malformed UUID in player id → `GraphQLError` with `BAD_USER_INPUT`; (f) `season` out of range → `GraphQLError` with `BAD_USER_INPUT`.
- [ ] T025 [P] [US1] In the same `*.spec.ts` (or a sibling parity spec), add a parity loop: for each `INDEX_CALCULATION_FIXTURES` entry, call the resolver with the fixture's `(type, players, defaultRanking)`, mock the underlying service to compute against the same helper, and assert the resolver's returned `index === getIndexFromPlayers(...)`.

**Checkpoint**: After Phase 4, US1 is independently complete. The new public query is callable; its parity with the canonical helper is mechanically enforced. The new frontend (BAD-119) is unblocked.

---

## Phase 5: User Story 4 — Existing backend consumers and legacy frontend keep working (P2)

**Goal**: Refactor `EventEntry.recalculateCompetitionIndex` to delegate to `IndexCalculationService.calculateOne` while preserving byte-identical `meta.competition.teamIndex` for every existing input. No legacy frontend edits.

**Independent Test**: `nx affected:test` covering `backend-database`, `backend-competition-enrollment`, `backend-graphql`, `backend-competition-assembly` — every existing test passes unchanged. The `recalculate-entry-index` script run against a representative DB snapshot produces a `meta.competition.teamIndex` for every entry that is byte-identical to a baseline captured before the refactor (SC-006).

### Implementation

- [ ] T026 [US4] Edit `libs/backend/database/src/models/event/entry.model.ts` `recalculateCompetitionIndex` static hook (lines 194–286). Keep the `@BeforeUpdate @BeforeCreate` decorators and the `if (!instance.changed("meta")) return` short-circuit. Replace the inline body that fetches `SubEventCompetition`, `RankingSystem`, `RankingPlace`, fills components, and calls `getIndexFromPlayers`, with a single call to `IndexCalculationService.calculateOne(input, { transaction: options?.transaction })`. Build the input in **team-index mode**: pass `{ key: instance.id, type: team.type, season, rankingSystemId, subEventCompetitionId: instance.subEventId, players: instance.meta.competition.players.map(p => ({ id: p.id, single: p.single, double: p.double, mix: p.mix })) }`. Write the service result back: `instance.meta.competition.players = result.contributingPlayersResolvedFull` (the fully-resolved per-player components — the service must surface them on the success payload to support this; if not already, add a non-public `resolvedPlayers` field on `IndexCalculationSuccess` in T012 and consume it here) and `instance.meta.competition.teamIndex = result.index`.
- [ ] T027 [US4] Resolve the dependency direction: `@badman/backend-database` cannot import from `@badman/backend-competition-enrollment` directly because `EnrollmentModule` already imports from `@badman/backend-database` (cycle). Refactor by either (a) accepting the service as a static parameter via NestJS's `ModuleRef` lookup at hook invocation time, or (b) lifting `IndexCalculationService` into a thinner sub-package that both libs can depend on. Decision and execution belong in this task; see [research.md §R1](research.md) for the constraint analysis. Implement whichever option keeps `nx graph` acyclic and document the decision in a single-line code comment at the import site.
- [ ] T028 [P] [US4] Add a regression test next to `entry.model.ts` (e.g., `libs/backend/database/src/models/event/entry.model.spec.ts` — create if absent) that mocks `IndexCalculationService` and asserts: (a) the hook does NOT call `RankingPlace.findAll` directly anymore (it must go through the service); (b) when `meta.competition` changes, the hook calls `service.calculateOne` exactly once with the correct shape; (c) on Success, `instance.meta.competition.teamIndex` equals the service result's `index`; (d) on Failure, the hook propagates a clear error (current behavior is to throw — preserve it for the maintenance script).
- [ ] T029 [P] [US4] Run `nx affected:test --base=develop` and confirm all backend test suites in `backend-database`, `backend-competition-enrollment`, `backend-competition-assembly`, and `backend-graphql` still pass. If any test breaks, the refactor has changed observable behavior — fix the refactor (do NOT mutate the test).
- [ ] T030 [P] [US4] Capture an SC-006 baseline: on `develop` (pre-refactor), run the `recalculate-entry-index` maintenance script (entry point: [`apps/scripts/src/app/scripts/recalculate-entry-index/recalculate-entry-index.service.ts`](../../apps/scripts/src/app/scripts/recalculate-entry-index/recalculate-entry-index.service.ts)) against a representative seeded DB and dump `(entryId, meta.competition.teamIndex)` to a CSV. Repeat on `006-unify-base-index-backend` after T026/T027 land. Diff the two CSVs; expectation: zero rows differ. Attach the diff (empty or otherwise) to BAD-136 as a comment.

**Checkpoint**: After Phase 5, US4 is independently complete. Existing consumers and the maintenance script produce byte-identical numbers. BAD-136 acceptance criterion #6 is satisfied.

---

## Phase 6: User Story 3 — Live, responsive enrollment UX (P2)

**Goal**: Verify the backend pieces that enable the new frontend's live UX (SC-003 latency, SC-004 single batch per window, FR-002a partial-failure behavior, FR-017 diagnostic logging). Frontend work is tracked in BAD-119 in a separate repository and is **not** in scope here.

**Independent Test**: Quickstart smoke test 1 (parity), 2 (partial failure), and the perf assertion in T031 all pass. Diagnostic logs at debug level capture the FR-017 payload for one representative input.

- [ ] T031 [P] [US3] Add an integration-style perf test (under `libs/backend/competition/enrollment/src/services/index-calculation/`) that constructs a batch of 10 inputs sharing `(season, rankingSystemId)`, spies on `RankingPlace.findAll`, calls `service.calculate(...)`, and asserts the spy was called **exactly once** (FR-018 dedupe + SC-004 batching guarantee on the BE side).
- [ ] T032 [P] [US3] Add a partial-failure smoke test in the resolver spec (or a sibling integration spec) mirroring [quickstart.md §Smoke test 2](quickstart.md): one valid input + one input with a non-existent player ID; assert the resolver throws `GraphQLError` with `extensions.code = PLAYER_NOT_FOUND` for the failing input (per-input failures are surfaced as GraphQL errors, not as a success result with an error field).
- [ ] T033 [P] [US3] In `index-calculation.service.ts`, emit a debug-level log per processed input containing `{ key, type, playerIds, resolvedPerPlayer: [{ id, single, double, mix }], bestN: [<ids>], missingPlayerCount, index }` (FR-017). Use NestJS `Logger` with context `IndexCalculationService`. Verify in the resolver test that the logger is invoked when `LOG_LEVEL=debug`.

**Checkpoint**: After Phase 6, the backend portion of US3 is satisfied. The frontend can now wire the query under BAD-119 with confidence that latency targets, batch dedupe, and partial-failure semantics match the spec.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T034 [P] Run `prettier --check .` and `nx lint backend-competition-enrollment backend-graphql backend-database utils` — all must pass before review.
- [ ] T035 [P] Update [`specs/006-unify-base-index-backend/spec.md`](spec.md) FR-016a / SC-005 if the canonical-helper test count grew during T002/T003 (the count is currently 37). Keep the file path reference accurate.
- [ ] T036 PR description checklist (per Constitution governance): explicitly state that this PR (a) does NOT touch i18n (Principle II n/a), (b) does NOT touch legacy frontend (Principle V respected), (c) introduces a query (no transaction needed; Principle III n/a for the new resolver) but the entry-model hook continues to honour its calling transaction, (d) the new resolver follows Principle IV resolver-test discipline, (e) is code-first GraphQL via co-located `@InputType` / `@ObjectType` (Principle I respected — no new persistent entity).

---

## Dependencies

```text
Phase 1 (Setup) ─┐
                 ▼
Phase 2 (Foundational: fixtures + types + GraphQL classes) ─┐
                                                            ▼
                              Phase 3 (US2: shared service) ─┐
                                                             ├──▶ Phase 4 (US1: resolver)   ─┐
                                                             ├──▶ Phase 5 (US4: hook refactor) ─┤
                                                             └──▶ Phase 6 (US3: UX BE pieces)  ─┤
                                                                                                ▼
                                                                                Phase 7 (Polish)
```

- **Phases 4, 5, 6 are independent** once Phase 3 is done — they can be implemented in parallel by separate workstreams.
- Phase 5 (US4) is the highest-risk phase because of the dependency-direction constraint in T027; tackle it early enough to surface that constraint before review pressure.

## Parallel Execution Examples

### Phase 2 (foundational, can all run in parallel)

```text
T002 [P] (utils fixture file)        ┐
T003 [P] (utils spec refactor)       ├── 3 distinct files; no cross-deps once T002 lands
T004 [P] (BE service types)          │
T005 [P] (GraphQL InputType)         │
T006 [P] (GraphQL ObjectType)        ┘
```

(Note: T003 logically depends on T002, but they are different files; run T002 → then T003 in parallel with T004/T005/T006.)

### Phase 3 (US2 service tests, after T007–T014 land)

```text
T015 [P] (parity loop test)              ┐ Same spec file
T016 [P] (partial-failure test)          ├ → run in parallel only if split across separate `describe` blocks
T017 [P] (snapshot-dedupe test)          ┘   contributed by separate commits.
```

### Phase 4 + 5 + 6 (US1, US4, US3 — full stories in parallel)

```text
US1 (Phase 4): T018 → T019 → T020 → T021 → T022 → T023, then T024+T025 in parallel
US4 (Phase 5): T026 + T027 (sequential), then T028+T029+T030 in parallel
US3 (Phase 6): T031, T032, T033 in parallel
```

These three streams touch different files and can be worked by three contributors simultaneously after Phase 3 closes.

## Implementation Strategy

**MVP scope (US1 + US2 only)**: Phase 1 + 2 + 3 + 4 — delivers the live-correct base index for the frontend (BAD-119 unblocked) without touching the entry-model hook. The hook keeps its inline implementation; SC-001 / SC-002 / SC-003 / SC-004 / SC-005 are achieved. SC-006 deferred to the next increment.

**Increment 2 (US4)**: Phase 5 — extracts the hook glue into the shared service so the canonical formula is structurally the only path on the backend (closes BAD-136 acceptance criteria #6 and #7).

**Increment 3 (US3 polish + Phase 7)**: Verification, perf tests, diagnostic logging, lint, PR description.

This order means BAD-119 (frontend) can ship as soon as Phase 4 lands, in parallel with the rest of the work.
