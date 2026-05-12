---
description: "Task list for BAD-21: Reliable Enrollment Submission Errors"
---

# Tasks: Reliable Enrollment Submission Errors (BAD-21)

**Input**: Design documents from `/specs/001-fix-enrollment-submit-error/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/createEnrollment.graphql.md](./contracts/createEnrollment.graphql.md)

**Tests**: Required by Constitution IV (Resolver Test Discipline). Resolver unit tests follow the reference pattern in `libs/backend/graphql/src/resolvers/enrollmentSetting/enrollmentSetting.resolver.spec.ts`.

**Organization**: Tasks are grouped by user story so each story can be implemented and verified in isolation. Note: all stories touch the same `enrollment.resolver.ts` file, so within each story the tasks are sequential at the file level — `[P]` markers appear only on tasks that touch a different file.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths are absolute or repo-relative.

## Path Conventions

- Resolver: `libs/backend/graphql/src/resolvers/event/competition/enrollment.resolver.ts`
- New `@ObjectType`: `libs/backend/graphql/src/resolvers/event/competition/enrollment-result.object.ts`
- Resolver spec: `libs/backend/graphql/src/resolvers/event/competition/enrollment.resolver.spec.ts`
- Reference pattern: `libs/backend/graphql/src/resolvers/enrollmentSetting/enrollmentSetting.resolver.spec.ts`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the editing surface and that the spec test harness runs green before we change anything.

- [X] T001 Verify the resolver path and current shape: open `libs/backend/graphql/src/resolvers/event/competition/enrollment.resolver.ts` and confirm `EnrollmentResolver.createEnrollment(@User user, @Args teamId, @Args subEventId)` returns `Boolean` and is registered in the corresponding NestJS module.
- [X] T002 Run the existing `backend-graphql` test suite once to capture a green baseline before any edits: `npx jest --config libs/backend/graphql/jest.config.ts`. If anything fails, stop and reconcile before proceeding.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Author the new `@ObjectType` that all three user stories depend on as the mutation's new return type. No user story phase can complete without this.

**⚠️ CRITICAL**: All user-story phases below depend on T003.

- [X] T003 Create the `EnrollmentResult` `@ObjectType` at `libs/backend/graphql/src/resolvers/event/competition/enrollment-result.object.ts` with non-null fields `teamId: ID`, `subEventCompetitionId: ID`, `alreadyExisted: Boolean`. Author it as a code-first NestJS `@ObjectType` class per Constitution I (no SDL, no DTO duplication). See [data-model.md §New GraphQL output type](./data-model.md).

**Checkpoint**: `EnrollmentResult` exists and is importable. User-story phases can now begin.

---

## Phase 3: User Story 1 — Classified errors on a failed enrollment submit (Priority: P1) 🎯 MVP

**Goal**: Each documented failure mode (`PERMISSION_DENIED`, `TEAM_NOT_FOUND`, `SUB_EVENT_NOT_FOUND`, `SEASON_MISMATCH`, fallback `INTERNAL_ERROR`) surfaces as a `GraphQLError` with a stable `extensions.code` and the documented per-code payload (see [contracts/createEnrollment.graphql.md](./contracts/createEnrollment.graphql.md)).

**Independent Test**: Trigger each failure and confirm the response carries a distinct `extensions.code` and the right `extensions` fields; no message leak from internal exceptions.

- [X] T004 [US1] In `libs/backend/graphql/src/resolvers/event/competition/enrollment.resolver.ts`, reorder the resolver so the read-only `Team.findByPk(teamId)` happens BEFORE the permission check (so `team.clubId` is available for the club-scoped permission). Maintain the existing `Sequelize.transaction()` wrapping per Constitution III.
- [X] T005 [US1] In the same file, replace the current `hasAnyPermission(["edit:competition"])` call with `hasAnyPermission(["edit:competition", \`${team.clubId}_edit:club\`, "edit-any:club"])` (matching the established convention in `club.resolver.ts:208,253,312,342`). On failure throw `GraphQLError` with `extensions: { code: "PERMISSION_DENIED", userId: user?.id ?? null }`.
- [X] T006 [US1] In the same file, change the missing-team branch to throw `GraphQLError` with `extensions: { code: "TEAM_NOT_FOUND", teamId }` (this throw runs BEFORE the permission check per T004 ordering, so an unknown `teamId` always surfaces as `TEAM_NOT_FOUND`).
- [X] T007 [US1] In the same file, change the missing-sub-event branch to throw `GraphQLError` with `extensions: { code: "SUB_EVENT_NOT_FOUND", subEventId }`.
- [X] T008 [US1] In the same file, replace the generic `throw new Error("...not in the same season")` with `throw new GraphQLError("Team season does not match competition season.", { extensions: { code: "SEASON_MISMATCH", teamSeason: team.season, competitionSeason: subEvent.eventCompetition?.season } })`.
- [X] T009 [US1] In the same file, wrap the body in a try/catch where the catch (a) rolls back the transaction, (b) re-throws any `GraphQLError` it catches (so classified codes survive), and (c) for any other thrown value, logs the original error with full stack at `error` severity then throws a sanitized `GraphQLError("Internal error.", { extensions: { code: "INTERNAL_ERROR" } })` so internal details (SQL, stack frames) do not leak to the client.
- [X] T010 [US1] Add a structured `warn`-level log at each classified-rejection throw site in the same file: `this.logger.warn({ code, teamId, subEventCompetitionId: subEventId, userId: user?.id ?? null })`. UUID only — never email or other PII (Constitution / Q5).
- [X] T011 [US1] In `libs/backend/graphql/src/resolvers/event/competition/enrollment.resolver.spec.ts` (create if missing; mirror `enrollmentSetting.resolver.spec.ts`), add cases: anonymous user → `PERMISSION_DENIED` with no transaction opened; authenticated user with no matching permission → `PERMISSION_DENIED`; user with `${clubId}_edit:club` only → success; team not found → `TEAM_NOT_FOUND` with rollback; sub-event not found → `SUB_EVENT_NOT_FOUND` with rollback; season mismatch → `SEASON_MISMATCH` with both seasons in `extensions` and rollback; unexpected throw → `INTERNAL_ERROR` with rollback and `error`-level log. Use `Test.createTestingModule`, fake `Sequelize.transaction()` returning `{ commit, rollback }` jest.fn stubs, mock model statics with `jest.spyOn`, fake `Player` with `hasAnyPermission` jest.fn, `afterEach(jest.restoreAllMocks)`.

**Checkpoint**: All five error codes round-trip through the resolver with the right `extensions` payload, transaction rollback is verified, and unit tests are green.

---

## Phase 4: User Story 2 — Idempotent re-submit for a team already enrolled (Priority: P1)

**Goal**: Re-submitting an already-enrolled `(team, sub-event)` pair returns success without creating a duplicate `EventEntry`, and concurrent submits for the same pair result in exactly one entry.

**Independent Test**: Submit `(teamId, subEventId)` once, then again. The second call returns success and no duplicate `EventEntry` row is created. Verified at the resolver-unit level via mocks asserting that no `addEventEntry` call is made on the second path.

- [X] T012 [US2] In `libs/backend/graphql/src/resolvers/event/competition/enrollment.resolver.ts`, after the season check and inside the transaction, call `team.getEntry({ transaction })`. If `entry?.subEventId === subEventId`, short-circuit: commit the transaction (no further writes) and return `EnrollmentResult { teamId, subEventCompetitionId: subEventId, alreadyExisted: true }`. If `entry` exists but points to a different `subEventId`, fall through to the existing reassign-and-attach flow (preserved per [research.md §R3](./research.md)).
- [X] T013 [US2] In `libs/backend/graphql/src/resolvers/event/competition/enrollment.resolver.spec.ts`, add a case: a team whose existing entry already has `subEventId === requested subEventId` causes the resolver to return `alreadyExisted: true`, commit, and to NEVER call `addEventEntry` or `setEntry` (assert via `jest.fn().not.toHaveBeenCalled()`).

**Checkpoint**: Idempotent path verified; the original BAD-21 reproducer (resubmit producing a frightening error) returns clean success.

---

## Phase 5: User Story 3 — Structured success result the client can act on (Priority: P2)

**Goal**: The mutation returns `EnrollmentResult` (not `Boolean`), echoing `teamId`, `subEventCompetitionId`, and `alreadyExisted`, so the client can correlate per-call results when submitting multiple teams as separate calls.

**Independent Test**: A successful submit returns the three fields populated correctly; `alreadyExisted` is `false` for fresh creates and `true` for the idempotent path (already covered functionally by T013).

- [X] T014 [US3] In `libs/backend/graphql/src/resolvers/event/competition/enrollment.resolver.ts`, change the `@Mutation(() => Boolean)` decorator to `@Mutation(() => EnrollmentResult)`, import `EnrollmentResult` from `./enrollment-result.object.ts`, and update the function's return type and `return true;` line(s) to `return { teamId, subEventCompetitionId: subEventId, alreadyExisted: false };` for the fresh-create path. The idempotent path's return shape was already authored in T012.
- [X] T015 [US3] In `libs/backend/graphql/src/resolvers/event/competition/enrollment.resolver.spec.ts`, add a fresh-create success case asserting the returned object equals `{ teamId, subEventCompetitionId: subEventId, alreadyExisted: false }` and that `commit` was called exactly once.

**Checkpoint**: GraphQL contract change shipped; `Boolean` return type fully replaced by `EnrollmentResult`.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verify the change holistically, ensure tests + lint pass, and confirm the change does not touch out-of-scope surfaces (legacy frontend, i18n).

- [X] T016 Run the full lib test suite and confirm green: `nx test backend-graphql` (or `npx jest --config libs/backend/graphql/jest.config.ts`).
- [X] T017 Run lint on the affected lib: `nx lint backend-graphql`. Fix any lint issues introduced by the changes.
- [X] T018 Run `prettier --check libs/backend/graphql/src/resolvers/event/competition/`. Run `prettier --write` on those files if needed and re-check.
- [X] T019 Verify scope discipline: confirm no edits to `apps/badman/`, `libs/frontend/`, `libs/backend/translate/assets/i18n/**`, or `libs/utils/src/lib/i18n.generated.ts` (Constitution V + II). Run `git diff --stat` and inspect.
- [ ] T020 Manually smoke-test the mutation against a local API + DB per [quickstart.md §Manual smoke test](./quickstart.md): trigger fresh enrollment, idempotent re-submit, and each of the five error classes, observing the response `extensions.code` values. **Status: deferred — needs a human at the running API + GraphQL Playground; cannot be automated from the implementation pass. Run before merging the PR.**
- [X] T021 [P] Append a new entry to `docs/tech-debt.md` (existing registry; do NOT create a new file) under the `## Backend` section, documenting the technical debt and recommended future actions left by this fix. Cover at minimum: (a) no DB-level uniqueness on `Entries(teamId)` or `Entries(teamId, subEventId)` — idempotency is application-level via `Team @HasOne EventEntry` plus the new short-circuit, leaving a narrow concurrent-write window (FR-005 / SC-005); (b) the silent cross-sub-event move when a team's existing entry points elsewhere ([research.md §R3](../specs/001-fix-enrollment-submit-error/research.md)) is preserved — flag whether product wants this surfaced as a distinct outcome in a future iteration; (c) `SUB_EVENT_FULL` and similar capacity codes were intentionally left out of the v1 closed error list and may need to be added later. For each entry: state Where, What, Why we shipped it, Fix effort + Trigger to revisit, Status. Add a row to the existing debt table at the top of the file in the same order, and bump the version comment.

---

## Dependencies

- T001, T002 (Setup) before everything.
- T003 (Foundational `EnrollmentResult`) blocks Phase 5 (T014, T015) and is also imported by T012/T013 in Phase 4 — so T003 effectively blocks all user-story phases.
- Within Phase 3 (US1): T004 → T005 (T005 reads `team.clubId` set up by T004); T006 depends on T004 ordering; T007–T010 depend on T004; T011 (tests) depends on T004–T010.
- Phase 4 (US2): depends on Phase 3 completion (US2's tests assert `commit` semantics added in US1's catch path).
- Phase 5 (US3): depends on Phase 4 (idempotent return shape is authored there) and on T003.
- Phase 6: runs last.

## Parallel Execution

Most tasks edit the same single resolver file (`enrollment.resolver.ts`) and its single spec file, so very few opportunities for parallel work exist.

True parallel pairs:

- T003 (new file `enrollment-result.object.ts`) is parallelizable with T001/T002 if the engineer prefers; mark `[P]` if running concurrently.

## Implementation Strategy

1. **MVP (US1)**: Phase 1 → Phase 2 → Phase 3. After Phase 3 the failure modes are correctly classified and observable in logs — this alone resolves the BAD-21 triage problem (you can identify the original error from server logs alone) even before idempotency or the structured success ships.
2. **Full v1**: Continue with Phase 4 (idempotency) → Phase 5 (structured success) → Phase 6 (polish). The active frontend repo will be updated separately to consume the new contract; in this repo, the legacy frontend is not touched (Constitution V).
3. **Increment ordering rationale**: US1 first because it is the smallest change that unblocks BAD-21 triage. US2 second because it removes the most user-visible regression class (scary error on retry). US3 last because it is the contract change that requires the active frontend to migrate in lockstep.
