---
description: "Tasks for finishEventEntry Hardening"
---

# Tasks: finishEventEntry Hardening

**Input**: Design documents in `/specs/007-finish-event-entry-hardening/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/finish-event-entry.graphql](contracts/finish-event-entry.graphql)

**Tests**: Included. FR-007 in [spec.md](spec.md) explicitly requires a co-located resolver spec; Constitution Principle IV mandates the resolver test pattern. Tests are part of the deliverable, not optional.

**Organization**: Tasks grouped by user story. Stories US1 (atomic transaction) and US2 (idempotent re-submission) modify the same resolver method, so they MUST be implemented sequentially against `entry.resolver.ts`. US3 (resolver tests) co-evolves and is checkpointed last.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Different file or trivially-isolated change; no dependency on incomplete tasks.
- **[Story]**: US1 / US2 / US3 — maps to user stories in [spec.md](spec.md).
- File paths are absolute from repo root.

## Path Conventions

Single-project, in-place modification of [`libs/backend/graphql/`](../../libs/backend/graphql/). No new app or lib. No DB migration.

---

## Phase 1: Setup

**Purpose**: Prepare the working tree. Branch already exists.

- [x] T001 Verify branch `007-finish-event-entry-hardening` is checked out and clean: `git status` returns no surprises; `git rev-parse --abbrev-ref HEAD` returns the branch name
- [x] T002 [P] Confirm Docker stack is up for local verification (`npm run docker:up`) so quickstart §3 can run later

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types and registry entries that BOTH US1 and US2 need before resolver edits.

**⚠️ CRITICAL**: No story implementation may begin until this phase is complete.

- [x] T003 Add `NO_TEAMS_TO_FINALISE: "NO_TEAMS_TO_FINALISE"` to the registry in `libs/backend/graphql/src/utils/error-codes.ts` under a new `// Event entry finalisation` group; keep alphabetical-within-group ordering as the file establishes
- [x] T004 [P] Create the `FinishEventEntryResult` `@ObjectType` in `libs/backend/graphql/src/resolvers/event/finish-event-entry-result.object.ts` with three `Boolean!` fields (`success`, `alreadyFinalised`, `notificationDispatched`) and the field descriptions from [contracts/finish-event-entry.graphql](contracts/finish-event-entry.graphql); follow the structure of `libs/backend/graphql/src/resolvers/team/team-result.object.ts`
- [x] T005 Export `FinishEventEntryResult` from the appropriate barrel/index so it is reachable by `entry.resolver.ts` (verify there is no separate index file in `resolvers/event/`; if there is, add the export — otherwise direct import is fine and this task is a no-op)

**Checkpoint**: Result type exists, error code exists. Stories can now begin.

---

## Phase 3: User Story 1 — Atomic submission finalisation (Priority: P1) 🎯 MVP

**Goal**: Wrap every database write inside a single Sequelize transaction. Roll back on any thrown error. Move notification dispatch to after `commit`. Reject zero-team finalisation with `NO_TEAMS_TO_FINALISE`. Switch the mutation return to `FinishEventEntryResult`.

**Independent Test**: Run the resolver against a real or mocked DB; force the `Logging.create` call to throw mid-flight; verify `transaction.rollback` runs and no `EventEntry.sendOn` is set. Verified end-to-end via [quickstart.md](quickstart.md) §3.a and [research.md](research.md) R7 cases #3, #4, #5.

### Implementation for User Story 1

- [x] T006 [US1] Inject `Sequelize` into `EventEntryResolver` constructor in `libs/backend/graphql/src/resolvers/event/entry.resolver.ts` (private field `_sequelize`). Pattern: copy from `libs/backend/graphql/src/resolvers/enrollmentSetting/enrollmentSetting.resolver.ts`
- [x] T007 [US1] Change `finishEventEntry` return type from `Boolean` to `FinishEventEntryResult` (decorator `@Mutation(() => FinishEventEntryResult)`, TS return `Promise<FinishEventEntryResult>`) in `libs/backend/graphql/src/resolvers/event/entry.resolver.ts`
- [x] T008 [US1] Open a transaction via `await this._sequelize.transaction()` at the start of the mutation body (after auth + `Club.findByPk` checks); pass `{ transaction }` to every Sequelize call inside; `commit()` on success, `rollback()` in a `catch` re-throw block, in `libs/backend/graphql/src/resolvers/event/entry.resolver.ts`
- [x] T009 [US1] Inside the transaction: replace the existing `Team.findAll(...)` with one that includes `EventEntry` AND uses `lock: transaction.LOCK.UPDATE` on the included entries (or a separate `EventEntry.findAll({ where: { teamId: { [Op.in]: teamIds } }, lock, transaction })` after fetching teams), in `libs/backend/graphql/src/resolvers/event/entry.resolver.ts`. Reference: [research.md](research.md) R1
- [x] T010 [US1] Add zero-team rejection: if `teams.length === 0`, throw `new GraphQLError("No teams to finalise for this club and season", { extensions: { code: ErrorCode.NO_TEAMS_TO_FINALISE, clubId, season } })`. Imports: `GraphQLError` from `graphql`; `ErrorCode` from `../../utils/error-codes`. Place this throw inside the transaction so the rollback runs. File: `libs/backend/graphql/src/resolvers/event/entry.resolver.ts`
- [x] T011 [US1] Move the notification dispatch (`this.notificationService.notifyEnrollment(...)`) to AFTER `await transaction.commit()`; wrap it in `try/catch`; on success set `notificationDispatched = true`, on failure log via NestJS `Logger` and set `notificationDispatched = false`. Do NOT re-throw. File: `libs/backend/graphql/src/resolvers/event/entry.resolver.ts`. Reference: [research.md](research.md) R2
- [x] T012 [US1] Construct and return `{ success: true, alreadyFinalised: false, notificationDispatched }` on the fresh path in `libs/backend/graphql/src/resolvers/event/entry.resolver.ts`

**Checkpoint**: Mutation is now atomic on the fresh path; zero-teams rejected; new return type wired. US1 passes its independent tests in isolation.

---

## Phase 4: User Story 2 — Idempotent re-submission (Priority: P1)

**Goal**: When every `EventEntry` for `(clubId, season)` already has `sendOn !== null`, perform no notification, no audit row, no `sendOn` writes. The only permitted DB write on this path is updating `Club.contactCompetition` if the supplied email differs.

**Independent Test**: Call the mutation twice with identical args; assert second call returns `alreadyFinalised: true`, no second `Logging` row, no second notification, original `sendOn` timestamps unchanged. Reference: [research.md](research.md) R7 cases #6, #7, #8.

### Implementation for User Story 2

- [x] T013 [US2] Inside the transaction (after T009's locked read of entries, before any writes), compute `alreadyFinalised = entries.length > 0 && entries.every(e => e.sendOn !== null)` in `libs/backend/graphql/src/resolvers/event/entry.resolver.ts`
- [x] T014 [US2] Branch on `alreadyFinalised`: on the no-op path, conditionally `await club.save({ transaction })` ONLY if `club.contactCompetition !== email` (after assigning the new value); skip every other write (no entry saves, no `Logging.create`); commit; return `{ success: true, alreadyFinalised: true, notificationDispatched: false }` WITHOUT calling the notification service. File: `libs/backend/graphql/src/resolvers/event/entry.resolver.ts`
- [x] T015 [US2] On the fresh path, ensure the existing `if (!team.entry) continue` skip survives the rewrite — teams with no entry row must not throw and must not block the loop. File: `libs/backend/graphql/src/resolvers/event/entry.resolver.ts`
- [x] T016 [US2] On the fresh path, only update `Team.entry.sendOn` for entries where `sendOn === null` (partial-state safety; matches FR-003 and acceptance scenario US2.2). File: `libs/backend/graphql/src/resolvers/event/entry.resolver.ts`

**Checkpoint**: Re-submission is idempotent. US1 + US2 both functional. The resolver matches the contract in [contracts/finish-event-entry.graphql](contracts/finish-event-entry.graphql).

---

## Phase 5: User Story 3 — Resolver test coverage (Priority: P2)

**Goal**: Co-located `entry.resolver.spec.ts` exercising every R7 scenario; CI fails fast if any contract regresses.

**Independent Test**: `npx jest --config libs/backend/graphql/jest.config.ts libs/backend/graphql/src/resolvers/event/entry.resolver.spec.ts` reports all 12 cases passing in under 5 s.

### Tests for User Story 3 (TDD-style — write FIRST, watch fail, then re-run after US1/US2)

> **NOTE**: T017 scaffolds the test file. Subsequent T018–T019 add cases that fail against the pre-hardening resolver and pass after US1+US2 are implemented. Authors may write tests upfront and only implement to green.

- [x] T017 [P] [US3] Create `libs/backend/graphql/src/resolvers/event/entry.resolver.spec.ts` with the test-module scaffold from `libs/backend/graphql/src/resolvers/enrollmentSetting/enrollmentSetting.resolver.spec.ts`: `Test.createTestingModule`, fake `Sequelize` whose `transaction()` returns `{ commit, rollback, LOCK: { UPDATE: 'UPDATE' } }` jest.fn() stubs, mocked `NotificationService`, mocked `EnrollmentValidationService`, fake `Player` factory with `hasAnyPermission` jest.fn(), `afterEach(jest.restoreAllMocks)`
- [x] T018 [US3] Add the 12 `it(...)` cases enumerated in [research.md](research.md) R7 to `libs/backend/graphql/src/resolvers/event/entry.resolver.spec.ts`. Each test uses `jest.spyOn` on `Club.findByPk`, `Team.findAll`, `EventEntry.findAll` (or whichever is used), `Logging.create`, plus mocked instance methods on returned objects. No real DB. Reference scenarios:
  - #1 unauthorized → `UnauthorizedException`
  - #2 unknown clubId → `NotFoundException`
  - #3 zero teams → `GraphQLError` with `extensions.code === ErrorCode.NO_TEAMS_TO_FINALISE`; `transaction.rollback` called
  - #4 fresh happy path → all expected writes; `commit`; notify; result `{ true, false, true }`
  - #5 rollback on `Logging.create` throw → `rollback` called; no notify; resolver re-throws
  - #6 already-finalised same email → no writes; result `{ true, true, false }`
  - #7 already-finalised differing email → only `club.save` inside txn; no entry/log writes; result `alreadyFinalised: true`
  - #8 partial state → only null entries updated; one log; one notify
  - #9 team with `entry === null` skipped without error
  - #10 notification rejects post-commit → DB committed; no throw; `notificationDispatched: false`
  - #11 row-lock query inspected — `findAll` second arg includes `lock: 'UPDATE'` and the same `transaction`
  - #12 `edit-any:club` permission grants access
- [x] T019 [US3] Run `npx jest --config libs/backend/graphql/jest.config.ts libs/backend/graphql/src/resolvers/event/entry.resolver.spec.ts` and confirm green. If a test fails because of a real bug exposed by US1/US2, fix the resolver — do NOT relax the test

**Checkpoint**: All three stories functional. Spec covers every contract clause.

---

## Phase 6: Polish & Cross-Cutting

- [x] T020 [P] Run `nx lint backend-graphql` and `prettier --check libs/backend/graphql/src/resolvers/event/` ; fix anything reported
- [x] T021 [P] Run `nx affected:test` from the monorepo root; investigate any unrelated breakage
- [x] T022 Walk [quickstart.md](quickstart.md) §3.a, §3.b, §3.c against a local `nx serve api` and confirm each terminal outcome matches expectations
- [x] T023 Confirm `AGENTS.md` SPECKIT block points at `specs/007-finish-event-entry-hardening/plan.md` (already updated in `/speckit-plan`; verify only)
- [x] T024 Hand [frontend-changes.md](frontend-changes.md) to the sibling `badman-frontend` repo (open companion PR there); link both PRs in their descriptions per [frontend-changes.md](frontend-changes.md) §9

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) → no dependencies
- Foundational (Phase 2) → depends on Setup; BLOCKS all stories
- US1 (Phase 3) → depends on Foundational
- US2 (Phase 4) → depends on US1 because both edit `entry.resolver.ts`; cannot truly parallelise
- US3 (Phase 5) → can START in parallel with US1/US2 (T017 scaffold), but T019 (final green run) depends on US1+US2 done
- Polish (Phase 6) → depends on US1+US2+US3 done

### Within Each User Story

- Tests first if author chooses TDD (recommended: write T017 + skeletal T018 cases before T006).
- Within US1: T006 → T007 → T008 → T009 → T010 → T011 → T012 (linear; same file).
- Within US2: T013 → T014 → T015/T016 (T015/T016 are sanity preservations, can be done together).

### Parallel Opportunities

- T002 || T001 (T002 just verifies Docker; independent)
- T003 || T004 (different files)
- T017 (scaffold spec file) can start as soon as T004 lands — runs in parallel with T006–T012
- T020 || T021 (lint vs. affected tests; different processes, both read-only of source)

---

## Parallel Example: Foundational + US3 scaffold

```bash
# Foundational, in parallel:
Task: "T003 — add NO_TEAMS_TO_FINALISE to libs/backend/graphql/src/utils/error-codes.ts"
Task: "T004 — create libs/backend/graphql/src/resolvers/event/finish-event-entry-result.object.ts"

# Then US3 scaffold concurrently with US1 implementation:
Task: "T017 — scaffold libs/backend/graphql/src/resolvers/event/entry.resolver.spec.ts"
Task: "T006 — inject Sequelize into EventEntryResolver"
```

---

## Implementation Strategy

### MVP First (US1)

1. Phase 1 → Phase 2 → Phase 3 (US1 only) → run quickstart §3.a + §3.c.
2. STOP. Demo: atomic transaction + zero-teams rejection + new return type. Value delivered: no more partial-write incidents.

### Incremental Delivery

1. Add US2 → run quickstart §3.b. Demo: idempotent re-submit.
2. Add US3 → CI gate flips green; future regressions caught.
3. Polish → coordinate with frontend PR per [frontend-changes.md](frontend-changes.md) §9.

### Parallel Team Strategy

One developer is sufficient — feature is small. If two: A handles US1+US2 (single resolver, sequential), B handles US3 (test file). Sync at T019.

---

## Notes

- Every task touching `entry.resolver.ts` is sequential because they edit the same file. Do not mark them `[P]`.
- `[P]` reserved for genuinely-isolated work: separate files (T004, T017), separate processes (T020, T021).
- Commit after each phase checkpoint at minimum; per-task commits are encouraged inside US1 (the resolver edits are non-trivial).
- Do NOT introduce `useTransaction` helpers, decorators, or any abstraction beyond what `enrollmentSetting.resolver.ts` already demonstrates. Match the project's existing pattern.
- No translation work in this feature — `translation-manager` is NOT invoked.
