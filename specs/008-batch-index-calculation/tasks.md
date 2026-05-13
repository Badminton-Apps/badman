# Tasks: Batch Index Calculation in Team Creation

**Input**: Design documents from `specs/008-batch-index-calculation/`
**Branch**: `016-batch-index-calculation`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup

No new infrastructure needed — this is a pure refactor within existing files. Phase 1 consists of verifying the working state before changes.

- [ ] T001 Confirm `nx test backend-graphql` passes on current branch (baseline green)

---

## Phase 2: Foundational — Helper Extractions

**Purpose**: Extract the three private helpers that both `createTeam` and `createTeams` will use. These must be complete before any user story work.

**⚠️ CRITICAL**: `_createTeamCore` blocks all user story phases.

- [ ] T002 Extract `indexFailureToGraphQLError(result, context)` private method in `libs/backend/graphql/src/resolvers/team/team.resolver.ts` — moves the error-code mapping chain (lines ~342–353) out of `createTeam` body; method logs + throws `GraphQLError` with the correct `ErrorCode`
- [ ] T003 Extract `applyIndexResultToEntry(entry, result, origPlayerMap, transaction)` private async method in `libs/backend/graphql/src/resolvers/team/team.resolver.ts` — moves the `origById` map + `competitionPlayers` merge + `dbEntry.save` block (lines ~356–379) out of `createTeam` body; returns `Promise<void>`
- [ ] T004 Add `IndexPayload` and `CoreTeamResult` interfaces (or inline types) near top of `libs/backend/graphql/src/resolvers/team/team.resolver.ts` (see data-model.md for field definitions; `IndexPayload` includes `entry: EventEntry`)
- [ ] T005 Extract `_createTeamCore(data, nationalCountsAsMixed, user, transaction)` private async method in `libs/backend/graphql/src/resolvers/team/team.resolver.ts` — moves the full body of `createTeam` (club lookup, permission check, idempotency, Team.create, players, EventEntry.findOrCreate, single calculateOne + applyIndexResultToEntry) into this helper; returns `CoreTeamResult`; does NOT commit or rollback
- [ ] T006 Slim down `createTeam` to a transaction wrapper: open tx → `_createTeamCore` → commit/rollback in `libs/backend/graphql/src/resolvers/team/team.resolver.ts`; verify existing `createTeam` unit tests still pass

**Checkpoint**: `createTeam` behavior is identical to before. `nx test backend-graphql` green.

---

## Phase 3: User Story 1 — Batch `createTeams` (Priority: P1) 🎯 MVP

**Goal**: `createTeams` processes all teams in a single shared transaction with one batched `calculate()` call instead of N per-team `calculateOne()` calls.

**Independent Test**: Submit enrollment for 8 teams; verify `IndexCalculationService.calculate` is called exactly once with 8 inputs and all team indices are returned correctly.

### Implementation

- [ ] T007 [US1] Refactor `createTeams` in `libs/backend/graphql/src/resolvers/team/team.resolver.ts` to open one shared `Sequelize` transaction and call `_createTeamCore` sequentially (preserving the existing type/teamNumber sort order) collecting `CoreTeamResult[]`
- [ ] T008 [US1] In `createTeams`, filter `CoreTeamResult[]` for entries with `indexPayload` defined, call `this.indexCalculationService.calculate(payloads.map(p => p.input), { transaction })` once with all inputs in `libs/backend/graphql/src/resolvers/team/team.resolver.ts`
- [ ] T009 [US1] In `createTeams`, fan back results: for each `IndexCalculationResult` — if failure call `indexFailureToGraphQLError`; if success look up the matching payload by `key` and call `applyIndexResultToEntry` in `libs/backend/graphql/src/resolvers/team/team.resolver.ts`
- [ ] T010 [US1] Add `catch` block to `createTeams` that calls `transaction.rollback()` and re-throws (mirrors pattern in `createTeam`) in `libs/backend/graphql/src/resolvers/team/team.resolver.ts`

### Tests

- [ ] T011 [US1] Write test in `libs/backend/graphql/src/resolvers/team/team.resolver.spec.ts`: `createTeams` with 3 teams that each have entries with player metadata → `indexCalculationService.calculate` spy called exactly once with array of 3 `IndexCalculationInput` objects
- [ ] T012 [US1] Write test: `createTeams` where one team has no entry (no `indexPayload`) → `calculate` called with N−1 inputs (or not called at all if none have entries)
- [ ] T013 [US1] Write test: `createTeams` where `calculate` returns a failure for one team → mutation throws `GraphQLError` and `transaction.rollback` is called
- [ ] T014 [US1] Write test: `createTeams` where all teams `alreadyExisted: true` → `calculate` never called

**Checkpoint**: `createTeams` uses one transaction and one `calculate()` call. All US1 tests pass.

---

## Phase 4: User Story 2 — Result Correctness (Priority: P2)

**Goal**: Prove the batch path produces identical index values and player fields as the prior per-team `calculateOne` path.

**Independent Test**: Compare response from `createTeams` (new code) against expected per-player index values and `levelException` fields for a known team composition.

### Tests

- [ ] T015 [US2] Write test in `libs/backend/graphql/src/resolvers/team/team.resolver.spec.ts`: `createTeams` with 2 teams — mock `calculate` to return known success results; verify each team's `EventEntry.meta.competition.teamIndex` and `players` (including `levelException`, `levelExceptionReason`, `levelExceptionRequested`) match the mocked values exactly
- [ ] T016 [US2] Write test: `origPlayerMap` fields are preserved when `calculate` result does not include them — i.e., `applyIndexResultToEntry` correctly merges DTO fields onto the calculation result
- [ ] T017 [US2] Write test: a team with `type = NATIONAL` alongside a `type = MX` team is processed correctly (sort order preserved, both inputs passed to `calculate`)

**Checkpoint**: Result shape and field values are verified identical to the single-team path.

---

## Phase 5: User Story 3 — Observability (Priority: P3)

**Goal**: The existing Sentry span on `IndexCalculationService.calculate` still fires with accurate `input_count` equal to the number of teams in the batch.

**Independent Test**: Trigger `createTeams` with 8 teams; Sentry receives one span with `index_calc.input_count = 8`.

### Tests

- [ ] T018 [US3] Write test in `libs/backend/graphql/src/resolvers/team/team.resolver.spec.ts`: verify `indexCalculationService.calculate` is called with an array whose length equals the number of teams that have index payloads — this indirectly confirms Sentry will receive the correct `input_count` attribute (the span is instrumented inside the service, which is already tested separately)

**Checkpoint**: Observability contract confirmed via call-count assertion. Service-level Sentry tests remain unmodified.

---

## Phase 6: Polish & Cross-Cutting

- [ ] T019 Run `nx test backend-graphql` and confirm all tests pass
- [ ] T020 Run `nx lint backend-graphql` and fix any lint errors in `libs/backend/graphql/src/resolvers/team/team.resolver.ts`
- [ ] T021 Run `prettier --check libs/backend/graphql/src/resolvers/team/team.resolver.ts` and fix formatting

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** (baseline): No dependencies — start immediately
- **Phase 2** (helpers): Depends on Phase 1 — **BLOCKS all user story phases**
- **Phase 3** (US1): Depends on Phase 2 completion
- **Phase 4** (US2): Depends on Phase 3 completion (tests validate the batch path built in US1)
- **Phase 5** (US3): Depends on Phase 3 completion
- **Phase 6** (polish): Depends on all story phases

### Within Phase 2

T002 and T003 touch the same method body but different extracted blocks — do them in sequence to avoid merge conflicts. T004 (interfaces) can be done any time before T007.

### Within Phase 3

T007 → T008 → T009 → T010 must be sequential (all in `createTeams` body). Tests T011–T014 can be written in parallel with T007–T010 (different logical sections of the spec file).

---

## Parallel Opportunities

```
Phase 2 extractions (T002–T004): sequential — same method body
Phase 3 implementation (T007–T010): sequential — same method body
Phase 3 tests (T011–T014): [P] with each other — different test cases
Phase 4 tests (T015–T017): [P] with each other — different test cases
Phase 5 tests (T018): parallel with Phase 4
Phase 6 (T019–T021): sequential — lint/format after tests pass
```

---

## Implementation Strategy

### MVP (User Story 1 only)

1. Complete Phase 1 (baseline check)
2. Complete Phase 2 (helper extractions — critical path)
3. Complete Phase 3 (batch `createTeams` + tests)
4. **STOP and VALIDATE**: `nx test backend-graphql` green, manual smoke test
5. Ship — correctness and observability stories are verification, not new behavior

### Full Delivery

1. MVP above
2. Phase 4 — correctness test suite
3. Phase 5 — observability assertion
4. Phase 6 — lint/format pass

---

## Notes

- All changes in two files: `team.resolver.ts` (implementation) and `team.resolver.spec.ts` (tests)
- `IndexCalculationService` itself is unchanged
- `createTeam` (single-team mutation) behavior is identical post-refactor — it calls `_createTeamCore` + commits, same as before
- The `calculateOne` convenience method on the service is NOT removed — other callers (e.g. `calculate-index.resolver.ts`) still use it
