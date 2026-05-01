# Tasks: Team Name/Abbreviation On-Update Regeneration

**Input**: `specs/003-team-name-regeneration-on-update/`
**Branch**: `003-linear-bad-127`
**Date**: 2026-05-01

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no in-flight dependencies)
- **[Story]**: Maps to user story from spec.md (US1, US2, US3)

---

## Phase 1: Setup (Baseline Verification)

**Purpose**: Confirm test suites are green before touching production code. Establishes a clean diff baseline.

- [ ] T001 Run baseline test suites and confirm they pass: `nx test backend-database` and `nx test backend-graphql`

---

## Phase 2: Foundational (Blocking Prerequisite)

**Purpose**: Error code must exist before resolver or tests can reference it.

**⚠️ CRITICAL**: T002 must be complete before any Phase 3+ work that touches the resolver or resolver tests.

- [ ] T002 Add `TEAM_NUMBER_CONFLICT = 'TEAM_NUMBER_CONFLICT'` to the `ErrorCode` enum in `libs/backend/graphql/src/utils/error-codes.ts`

**Checkpoint**: Error code exists — resolver work and tests can now reference it.

---

## Phase 3: User Story 1 — Admin edits team number, sees correct name (Priority: P1) 🎯 MVP

**Goal**: When a team's number is updated, the stored name and abbreviation automatically reflect the new number. A conflicting number is rejected before any change is persisted.

**Independent Test**: Update a team's `teamNumber` field and verify `team.name` and `team.abbreviation` match the new number. Attempt to assign a number already held by a sibling team and verify `TEAM_NUMBER_CONFLICT` is returned with `conflictingTeamId`.

### Tests for User Story 1

- [ ] T003 [P] [US1] Write `@BeforeUpdate` hook unit tests in `libs/backend/database/src/models/team.model.spec.ts` (new file): cover `teamNumber` changed → `generateName` + `generateAbbreviation` called; neither changed → both skipped (spy-based, no real DB)
- [ ] T004 [P] [US1] Write `updateTeam` resolver tests in `libs/backend/graphql/src/resolvers/team/team.resolver.spec.ts`: unauthorized → `UnauthorizedException`; team not found → `NotFoundException`; duplicate number → `GraphQLError` with `code: TEAM_NUMBER_CONFLICT` and `conflictingTeamId`; number changes → commits transaction and returns team with correct name; unrelated field changes → name unchanged; error mid-update → rolls back transaction (follow `enrollmentSetting.resolver.spec.ts` pattern)

### Implementation for User Story 1

- [ ] T005 [US1] Add `@BeforeUpdate` and `@BeforeBulkUpdate` hooks to `libs/backend/database/src/models/team.model.ts`; guard on `instance.changed('teamNumber') || instance.changed('type')`; call `generateName` + `generateAbbreviation`; also fix `@BeforeBulkCreate` double-call bug: remove the extra `await this.generateAbbreviation(instance, options)` line so each instance is processed exactly once (depends on T001)
- [ ] T006 [US1] Update `updateTeam` mutation in `libs/backend/graphql/src/resolvers/team/team.resolver.ts`: (a) add `TEAM_NUMBER_CONFLICT` conflict guard after `dbTeam` fetch and before cascade; (b) delete the manual name/abbreviation construction block (lines 444–451); (c) update cascade intermediate saves to `{ hooks: false }` and inline temp-name construction in place of `_setNameAndAbbreviation`; (d) remove `_setNameAndAbbreviation` helper method (depends on T002, T005)

**Checkpoint**: User Story 1 fully functional. Run T003 + T004 tests to verify independently.

---

## Phase 4: User Story 2 — Admin changes team type, sees correct gender notation (Priority: P2)

**Goal**: When a team's `type` changes, the gender letter in `name` and `abbreviation` updates to match (e.g. "H" → "G" for men's → mixed). Covered by the same `@BeforeUpdate` hook added in Phase 3.

**Independent Test**: Update a team's `type` field and verify the gender letter in `name` and `abbreviation` reflects the new type. No implementation changes needed beyond Phase 3; phase adds type-specific test coverage.

### Tests for User Story 2

- [ ] T007 [US2] Add type-change test cases to `libs/backend/database/src/models/team.model.spec.ts`: `type` changed → `generateName` + `generateAbbreviation` called; `type` changed to each variant (men, women, mixed) → regional letter matches (depends on T003 — extends same file)
- [ ] T008 [US2] Add type-change test case to `libs/backend/graphql/src/resolvers/team/team.resolver.spec.ts`: type changes → `GraphQLError` not thrown, transaction committed, returned team name reflects new type notation (depends on T004 — extends same file)

**Checkpoint**: User Stories 1 and 2 independently testable. Hook handles both trigger conditions.

---

## Phase 5: User Story 3 — Enrollment wizard renumbers without delete-then-create (Priority: P3)

**Goal**: The resolver's cascade renumber path uses `{ hooks: false }` for intermediate temp-name saves and lets the `@BeforeUpdate` hook fire on the final save — enabling correct name regeneration without delete-then-create. Implementation is covered by T006 (step 3c); this phase adds test coverage for the cascade path.

**Independent Test**: Simulate renumbering ≥2 sibling teams in one operation; verify all final names match their new numbers and no team has a `_temp` suffix after completion.

### Tests for User Story 3

- [ ] T009 [P] [US3] Add bulk renumber test to `libs/backend/graphql/src/resolvers/team/team.resolver.spec.ts`: renumber ≥2 teams in one call, assert all names correct, no `_temp` suffix visible in final state, transaction committed (depends on T004 — extends same file)
- [ ] T010 [P] [US3] Add `@BeforeBulkCreate` single-call test to `libs/backend/database/src/models/team.model.spec.ts`: spy on `generateAbbreviation`; bulk-create ≥2 instances; assert spy called exactly once per instance (SC-005) (depends on T003 — extends same file)

**Checkpoint**: All three user stories independently testable. Cascade renumber path verified.

---

## Phase 6: Polish & Validation

**Purpose**: Confirm full test suite is green and no stale manual name construction remains.

- [ ] T011 Run full test suites to confirm all new and existing tests pass: `nx test backend-database` and `nx test backend-graphql`
- [ ] T012 [P] Verify no remaining manual name construction: `grep -n "getLetterForRegion" libs/backend/graphql/src/resolvers/team/team.resolver.ts` — expect zero hits after T006 cleanup

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Baseline)**: No dependencies — run immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 passing
- **Phase 3 (US1)**: Depends on Phase 2 (T002 must exist for resolver + tests)
  - T003 and T004 can run in parallel with each other and with T005
  - T006 depends on T002 + T005
- **Phase 4 (US2)**: Depends on Phase 3 tests (T003, T004) existing as base files; implementation already in Phase 3
- **Phase 5 (US3)**: Depends on Phase 3 implementation (T006) and base test files (T003, T004)
- **Phase 6 (Polish)**: Depends on all prior phases complete

### User Story Dependencies

- **US1 (P1)**: Foundational complete → can start; no dependency on US2/US3
- **US2 (P2)**: Foundational + US1 implementation done; test files created in US1
- **US3 (P3)**: Foundational + US1 implementation done (cascade fix is part of T006); test files created in US1

### Within Phase 3

- T003, T004, T005 can run in parallel (different files)
- T006 waits for T002 (error code) + T005 (hook implemented)

---

## Parallel Execution Example: Phase 3

```
# Launch simultaneously after T002 completes:
T003 — Write team.model.spec.ts (new file)
T004 — Write team.resolver.spec.ts additions
T005 — Add @BeforeUpdate hooks + fix @BeforeBulkCreate in team.model.ts

# After T005 completes:
T006 — Update team.resolver.ts (conflict guard, remove manual construction, cascade fix)
```

---

## Implementation Strategy

### MVP (User Story 1 only)

1. Phase 1: Baseline check
2. Phase 2: Add error code (T002)
3. Phase 3: T003 → T004 → T005 → T006
4. **STOP and VALIDATE**: `nx test backend-database && nx test backend-graphql`
5. Manually verify: update a team number via GraphQL → confirm stored name matches

### Incremental Delivery

1. US1 complete → number-change fix live (highest user impact)
2. US2 complete → type-change fix live (same hook, just test coverage)
3. US3 complete → enrollment cascade path verified clean
4. Each story ships without breaking the previous

### Single-developer Sequence

T001 → T002 → T005 → T003 → T006 → T004 → T007 → T008 → T009 → T010 → T011 → T012
