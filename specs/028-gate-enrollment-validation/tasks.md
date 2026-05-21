---
description: "Task list for gate-enrollment-validation feature"
---

# Tasks: Gate Enrollment Validation Field

**Input**: Design documents from `/specs/028-gate-enrollment-validation/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/graphql-schema-delta.md, quickstart.md

**Tests**: Included. Spec FR-009 requires new unit tests covering the opt-out and opt-in branches; plan §"Phase 1 Design" pins these as part of the deliverable.

**Organization**: Grouped by user story so each can be implemented, tested, and verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

Nx monorepo (no new project). All edits under existing libs:

- `libs/backend/graphql/src/resolvers/event/`
- `libs/backend/competition/enrollment/src/services/`
- `libs/backend/graphql/src/resolvers/team/`
- `libs/backend/graphql/src/resolvers/event/competition/`
- `libs/backend/database/src/models/event/`
- `libs/utils/src/config/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Wire the rollout-safety kill-switch into the platform's central config schema so every consumer sees the same flag.

- [ ] T001 Add `ENROLLMENT_VALIDATION_DEFAULT_ENABLED: Joi.boolean().optional().default(false)` to the Joi `configSchema` in `libs/utils/src/config/configuration.ts` (alongside the other boolean toggles such as `DB_CACHE`, `VISUAL_SYNC_ENABLED`).
- [ ] T002 Add `ENROLLMENT_VALIDATION_DEFAULT_ENABLED: process.env?.["ENROLLMENT_VALIDATION_DEFAULT_ENABLED"] === "true"` to the `load()` return object in `libs/utils/src/config/configuration.ts` so the env value is parsed into a boolean.
- [ ] T003 Add `ENROLLMENT_VALIDATION_DEFAULT_ENABLED: boolean;` to the `ConfigType` declaration in `libs/utils/src/config/configuration.ts` so resolvers can type-safely read it via `ConfigService<ConfigType>`.

**Checkpoint**: `nx build utils` succeeds. The new flag is visible to all consumers that import `ConfigType` from `@badman/utils`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: None. The setup phase produces the only cross-story prerequisite (the config flag). No additional foundational scaffolding is required because the change set is one resolver edit + one service-signature extension; there are no shared models, no migrations, and no new modules.

---

## Phase 3: User Story 1 — Quiet API during nightly sync (Priority: P1) 🎯 MVP

**Goal**: `EventEntry.enrollmentValidation` returns `null` and performs no DB work when the caller does not opt in. This single change removes the production flood and is the MVP.

**Independent Test**: Start `api` + `worker-sync` locally; run a GraphQL query that selects `enrollmentValidation` on several `EventEntry` rows **without** passing the `validate` argument; confirm every response field is `null` and that no `[IndexCalculationService]` log line is emitted for the request (matches spec User Story 1 Acceptance Scenario 1 and Quickstart Test 1).

### Tests for User Story 1

- [ ] T004 [P] [US1] In `libs/backend/graphql/src/resolvers/event/entry.resolver.spec.ts`, add a new `describe("EventEntryResolver.enrollmentValidation (gate)")` block following the conventions of the existing `finishEventEntry` describe block in the same file (`Test.createTestingModule`, mocked `ConfigService`, mocked `EnrollmentValidationCacheService`, `afterEach(jest.restoreAllMocks)`). Add a test: when `validate` is omitted and `ENROLLMENT_VALIDATION_DEFAULT_ENABLED` is `false`, the resolver returns `null` and `enrollmentValidationCache.getForTeam` is NOT called.
- [ ] T005 [P] [US1] Same file: add a test that when `validate: false` is passed and `ENROLLMENT_VALIDATION_DEFAULT_ENABLED` is `false`, the resolver returns `null` and `getForTeam` is NOT called.
- [ ] T006 [P] [US1] Same file: add a test verifying the resolver does NOT call `eventEntry.getTeam()` when computation is skipped (avoid the unnecessary association fetch).

### Implementation for User Story 1

- [ ] T007 [US1] In `libs/backend/graphql/src/resolvers/event/entry.resolver.ts` (the `enrollmentValidation` `@ResolveField` currently at lines 86–95): inject `private readonly configService: ConfigService<ConfigType>` into the constructor (import `ConfigService` from `@nestjs/config` and `ConfigType` from `@badman/utils` — see `apps/api/src/app/controllers/app.controller.ts` for the precedent pattern). Add an `@Args("validate", { type: () => Boolean, nullable: true, defaultValue: false }) validate: boolean` parameter to the resolver method. Update the field description to mention the default-null behavior and the opt-in arg.
- [ ] T008 [US1] In the same resolver method, implement the gate **with explicit-arg precedence** (per spec Clarifications 2026-05-21 Q1): if `validate === false` (received explicitly OR via the default), return `null` without calling `getTeam()` or the cache UNLESS the caller omitted the argument AND `configService.get("ENROLLMENT_VALIDATION_DEFAULT_ENABLED") === true`. To distinguish "explicit false" from "omitted with default-applied", change the `@Args` declaration to `nullable: true` (no `defaultValue`) and type the parameter `validate?: boolean`; treat `validate === undefined` as "omitted" (kill-switch applies) and `validate === false` as "explicit false" (always returns `null`).
- [ ] T009 [US1] Run `nx test backend-graphql -- --testPathPattern=entry.resolver` and confirm all three new tests pass and existing `finishEventEntry` tests still pass.

**Checkpoint**: Default-off behavior is wired. Spec Acceptance Scenarios US1#1 and Edge Case "opt-in false → null even with kill-switch" pass in unit tests.

---

## Phase 4: User Story 2 — Enrollment wizard still works (Priority: P1)

**Goal**: When a caller opts in via `validate: true`, the resolver returns the same payload the legacy implementation did, and the existing per-request DataLoader (`EnrollmentValidationCacheService`) still collapses multiple lookups for the same `(clubId, season)` into a single underlying computation.

**Independent Test**: Run a GraphQL query that selects `enrollmentValidation(validate: true)` for 5+ `EventEntry` rows from a club with multiple teams; confirm the response payload is non-null for each row and that exactly ONE `[IndexCalculationService]` `Index calculation: ... input(s)` log line appears per unique `(clubId, season)` in the response (matches spec US2 Acceptance Scenarios and Quickstart Test 2).

### Tests for User Story 2

- [ ] T010 [P] [US2] In `libs/backend/graphql/src/resolvers/event/entry.resolver.spec.ts`, add a test: when `validate: true` is passed, the resolver calls `eventEntry.getTeam()` once and `enrollmentValidationCache.getForTeam(team)` once, and returns the cache's resolved value verbatim.
- [ ] T011 [P] [US2] Same file: add a test for the kill-switch path — when `validate` is omitted AND `ENROLLMENT_VALIDATION_DEFAULT_ENABLED` is `true`, the resolver behaves identically to `validate: true` (delegates to the cache).
- [ ] T012 [P] [US2] Same file: add a test that when `validate: true` is passed but `enrollmentValidationCache.getForTeam` rejects (simulated `new Error("DB down")`), the rejection is surfaced to the caller (the resolver does NOT swallow it into `null`). This pins spec FR-006 / Edge Case "computation fails internally".

### Implementation for User Story 2

- [ ] T013 [US2] No new resolver edits beyond US1. Verify the resolver path from T008 already calls `enrollmentValidationCache.getForTeam(team)` when `validate === true` (or when omitted + kill-switch on) and returns its result unchanged. If the rejection-propagation test (T012) fails because of a defensive try/catch, remove the try/catch — the resolver must not catch.
- [ ] T014 [US2] Manual verification: run `nx run-many --target=serve --projects=api,worker-sync --parallel`, execute Quickstart Test 2 in `specs/028-gate-enrollment-validation/quickstart.md` against local data, and confirm the log line shows ONE batch per `(clubId, season)`.

**Checkpoint**: Wizard query still works end-to-end. Spec Acceptance Scenarios US2#1, US2#2 and FR-002/FR-004/FR-006 pass.

---

## Phase 5: User Story 3 — Other screens are unaffected (Priority: P2)

**Goal**: Non-wizard pages (player profile, encounter detail, team roster, score-entry) produce zero `[IndexCalculationService]` log lines per request.

**Independent Test**: Manually load each of the listed pages in the active frontend (or simulate via curl/Insomnia against `/graphql`) and confirm the API log stream shows zero `[IndexCalculationService]` lines tied to those requests.

### Tests for User Story 3

No new unit tests required. US3 is the observable consequence of US1's default-null gate; the resolver-level tests in T004–T006 already pin the behavior. Verification is operational.

### Implementation for User Story 3

- [ ] T015 [US3] Manual verification: run Quickstart Test 1 in `specs/028-gate-enrollment-validation/quickstart.md` and confirm log silence for representative public-facing queries (`eventEntries`, `team(id:)`, `encounterCompetitions`).
- [ ] T016 [US3] Document in `specs/028-gate-enrollment-validation/quickstart.md` (or a new `verification-log.md`) the exact queries used for verification and the log evidence (zero `[IndexCalculationService]` lines) so future regression checks can replay them. Optional if the same evidence is captured in PR description.

**Checkpoint**: Spec Acceptance Scenarios US3#1, US3#2 and Success Criteria SC-002 verified empirically.

---

## Phase 6: User Story 4 — Diagnostics for the next incident (Priority: P3)

**Goal**: Every `[IndexCalculationService]` log line (DEBUG and WARN) carries a stable caller identifier so a triage engineer can attribute the call path from the log line alone (spec FR-008, SC-004).

**Independent Test**: Trigger each call site once (wizard query with `validate: true`, `updateTeam` mutation, `createTeams` mutation, `createEntry` mutation, `calculateIndex` mutation, and an `EventEntry.save()` that mutates `meta.competition`) and confirm each emits a log line of the form `[<CallerTag>] N input(s), M player ref(s), Xms` with the correct tag.

### Tests for User Story 4

- [ ] T017 [P] [US4] In `libs/backend/competition/enrollment/src/services/index-calculation/index-calculation.service.spec.ts`, add a test: when `calculate(inputs, { caller: "TestCaller" })` is invoked and the duration exceeds the 1000 ms slow threshold (simulate by stubbing `Date.now()`), the WARN log line includes `[TestCaller]`. Use `jest.spyOn(Logger.prototype, "warn")` to capture.
- [ ] T018 [P] [US4] Same file: add a parallel test for the fast-path DEBUG log line including `[TestCaller]`.
- [ ] T019 [P] [US4] Same file: add a test that when `options.caller` is omitted, both log lines render WITHOUT the bracketed tag (backwards-compatible format).
- [ ] T020 [P] [US4] Same file: add a test that `calculateOne(input, { caller: "X" })` forwards `caller` to the underlying `calculate` invocation (so single-input call sites benefit from the same tagging).

### Implementation for User Story 4

- [ ] T021 [US4] In `libs/backend/competition/enrollment/src/services/index-calculation/index-calculation.service.ts`, extend the `calculate(inputs, options?)` signature so `options?: { transaction?: Transaction; caller?: string }`. Forward `caller` into the Sentry span attributes (`span?.setAttribute("index_calc.caller", options.caller)`) and inject it into both log lines: change the existing `this.logger.warn(\`Slow index calculation: ...\`)` and `this.logger.debug(\`Index calculation: ...\`)` to interpolate `${options?.caller ? \` [\${options.caller}]\` : ""}` after the level prefix.
- [ ] T022 [US4] In the same file, update `calculateOne(input, options?)` to forward `options` unchanged when calling `this.calculate([input], options)`.
- [ ] T023 [P] [US4] In `libs/backend/competition/enrollment/src/services/validate/enrollment.service.ts` at the `this.indexCalculationService.calculate(indexInputs)` call site (~line 278), pass `{ caller: "EnrollmentValidationService.fetchAndValidate" }` as the second argument.
- [ ] T024 [P] [US4] In `libs/backend/graphql/src/resolvers/team/team.resolver.ts` at the two `indexCalculationService.calculate(...)` call sites (`updateTeam` ~line 375 and `createTeams` ~line 431), pass `{ caller: "TeamsResolver.updateTeam" }` and `{ caller: "TeamsResolver.createTeams" }` respectively.
- [ ] T025 [P] [US4] In `libs/backend/graphql/src/resolvers/event/competition/enrollment-entry.service.ts` at the `indexCalculationService.calculateOne(...)` call site (~line 131), pass `{ caller: "EnrollmentEntryService.createEntry" }`.
- [ ] T026 [P] [US4] In `libs/backend/graphql/src/resolvers/event/competition/calculate-index/calculate-index.resolver.ts` at the `indexCalculationService.calculate(...)` call site (~line 85), pass `{ caller: "CalculateIndexResolver.calculateIndex" }`.
- [ ] T027 [P] [US4] In `libs/backend/database/src/models/event/entry.model.ts` at the `EventEntry.recalculateCompetitionIndex` static hook (~line 243), update the `service.calculateOne(...)` invocation to pass `{ transaction: options?.transaction, caller: "EventEntry.recalculateCompetitionIndex" }`.

**Checkpoint**: `nx test backend-enrollment` passes. Manual verification via Quickstart Test 4 in `specs/028-gate-enrollment-validation/quickstart.md` confirms every caller tag appears.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T028 [P] Run `nx affected:test` from repo root to confirm no other lib's tests regressed (in particular `backend-graphql`, `backend-enrollment`, `backend-database`).
- [ ] T029 [P] Run `nx affected:lint` and fix any new ESLint warnings introduced by the resolver edit (most likely: unused imports if `ConfigService` is added but unused in one branch; `@Args` decorator placement).
- [ ] T030 [P] Run `prettier --check libs/backend/graphql libs/backend/competition libs/backend/database libs/utils` and fix any drift with `prettier --write` on the same paths.
- [ ] T031 Execute Quickstart Tests 1–5 from `specs/028-gate-enrollment-validation/quickstart.md` end-to-end against a local stack and record the evidence in the PR description.
- [ ] T032 Add a one-line entry to `docs/tech-debt.md` under "Known compromises" documenting that cross-request caching of enrollment validation is a deferred follow-up (per spec Out of Scope and research R-003). Reference this feature spec by path.
- [ ] T033 Verify the GraphQL schema dump (if any is checked in or generated by CI) reflects the new `validate: Boolean` argument on `EventEntry.enrollmentValidation`. If a `schema.gql` artifact exists, regenerate it via the existing codegen task; otherwise skip.

**Checkpoint**: All affected tests/lints/format checks green. Spec Success Criteria SC-003 (parity), SC-004 (caller-tag triage), and SC-005 (no p95 regression) verifiable from the PR.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: T001 → T002 → T003 sequential (same file). No dependencies — can start immediately.
- **Phase 2 (Foundational)**: Empty.
- **Phase 3 (US1)**: Depends on Phase 1 complete (resolver reads `ConfigService` typed via the new `ConfigType` field). T004–T006 (tests) can run in parallel; T007 → T008 → T009 sequential (T008 edits the file T007 just changed; T009 runs them).
- **Phase 4 (US2)**: Depends on Phase 3 complete. T010–T012 in parallel; T013 sequential after; T014 manual.
- **Phase 5 (US3)**: Depends on Phase 3 complete (it's the same resolver edit observed from a different angle).
- **Phase 6 (US4)**: Independent of Phases 3–5 in principle (different files), so MAY run in parallel with Phases 3–5 if staffed by a second engineer. Service signature change (T021) MUST land before the six call-site updates (T023–T027) so they compile.
- **Phase 7 (Polish)**: After all stories.

### User Story Dependencies

- **US1**: Independent of others. Implements the gate.
- **US2**: Reuses US1's resolver edit; the implementation tasks (T013, T014) verify the opt-in branch already produced by T007/T008.
- **US3**: Pure verification of US1's behavior at the integration layer; no new code.
- **US4**: Fully independent — different files (`IndexCalculationService` + six call sites). Can ship in the same PR or split into a follow-up if US1–US3 need to merge urgently.

### Parallel Opportunities

- T004, T005, T006 (US1 tests): same file, but each adds a separate `it(...)` block — author them in parallel and stage in one commit.
- T010, T011, T012 (US2 tests): same file as above; parallel-author, single commit.
- T017–T020 (US4 service-level tests): same file, parallel-author.
- T023, T024, T025, T026, T027 (US4 call-site updates): different files, fully parallelizable once T021 lands.
- T028, T029, T030 (Polish lint/test/format): different commands, parallelizable.

---

## Parallel Example: User Story 4 call-site updates

After T021 (`IndexCalculationService.calculate` signature extension) is merged into the branch, run T023–T027 concurrently:

```bash
# Each touches a different file; safe to author in parallel:
Task: "Add caller tag in libs/backend/competition/enrollment/src/services/validate/enrollment.service.ts"
Task: "Add caller tags in libs/backend/graphql/src/resolvers/team/team.resolver.ts (updateTeam + createTeams)"
Task: "Add caller tag in libs/backend/graphql/src/resolvers/event/competition/enrollment-entry.service.ts"
Task: "Add caller tag in libs/backend/graphql/src/resolvers/event/competition/calculate-index/calculate-index.resolver.ts"
Task: "Add caller tag in libs/backend/database/src/models/event/entry.model.ts (EventEntry hook)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (T001–T003): config flag wired.
2. Phase 3 (T004–T009): resolver gate + tests.
3. **STOP**: deploy to staging behind the kill-switch defaulted to `false`. Validate that the API stays quiet during a simulated sync window.
4. If the active frontend's wizard query has NOT yet shipped `(validate: true)`, set `ENROLLMENT_VALIDATION_DEFAULT_ENABLED=true` in production as the rollout-safety net (spec FR-010). Otherwise leave the flag unset (`false`).
5. Deploy to production.

### Incremental Delivery

- Increment 1: Phases 1 + 3 → MVP shipped (US1, US3 observed in production).
- Increment 2: Phase 4 → wizard parity validated in staging.
- Increment 3: Phase 6 → caller-tag diagnostics deployed (US4).
- Increment 4: Phase 7 → polish, lint, format, docs.

### Parallel Team Strategy

Two engineers can split:

- Engineer A: Phases 1, 3, 4, 5 (resolver gate + verification).
- Engineer B: Phase 6 in parallel (caller-tag plumbing in `IndexCalculationService` and call sites).
- Both converge on Phase 7.

---

## Notes

- [P] tasks = different files, no incomplete dependency.
- [Story] label maps each task to a spec user story for traceability.
- All tests follow the resolver-test convention referenced by Constitution Principle IV (`enrollmentSetting.resolver.spec.ts`).
- No translations are touched — Constitution Principle II is not engaged.
- No new mutation — Constitution Principle III is not engaged.
- No legacy-frontend edits — Constitution Principle V satisfied by inspection.
- Commit after each task or logical group; coordinate with [auto-commit hook](.specify/extensions/git/git-config.yml).
