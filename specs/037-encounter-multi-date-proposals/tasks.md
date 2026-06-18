# Tasks: Encounter Multi-Date Proposals & Counter-Offer Flow

**Input**: Design documents from `specs/037-encounter-multi-date-proposals/`
**Branch**: `feat/037-encounter-multi-date-proposals`
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md) | **Contract**: [contracts/encounter-change.graphql.md](./contracts/encounter-change.graphql.md)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Exact file paths required in every task

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Enums, migration, and model changes that ALL user stories depend on. Must be complete before any mutation work begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T001 [P] Add `ChangeEncounterParty` enum to `packages/utils/src/lib/enums/changeEncounterParty.enum.ts` and export from `packages/utils/src/lib/enums/index.ts`
- [x] T002 [P] Add `ChangeEncounterDateStatus` enum to `packages/utils/src/lib/enums/changeEncounterDateStatus.enum.ts` and export from `packages/utils/src/lib/enums/index.ts`
- [x] T003 [P] Add `EncounterChangeViewState` enum to `packages/utils/src/lib/enums/encounterChangeViewState.enum.ts` and export from `packages/utils/src/lib/enums/index.ts`
- [x] T004 Write migration `database/migrations/YYYYMMDD-add-encounter-change-multi-date.js` — up: add `lastActionBy`/`lastActionAt` to `EncounterChanges`, add `proposedBy`/`status` to `EncounterChangeDates` (nullable), backfill all four columns, add NOT NULL constraints, drop `accepted` and `selected`; down: reverse (see data-model.md for full SQL)
- [x] T005 Update `packages/backend-database/src/models/event/competition/encounter-change/encounter-change.model.ts` — remove `accepted` field, add `lastActionBy: ChangeEncounterParty` and `lastActionAt: Date` columns with `DataType.ENUM(...Object.values(ChangeEncounterParty))` and `DataType.DATE`; update `EncounterChangeUpdateInput` to drop `accepted`
- [x] T006 Update `packages/backend-database/src/models/event/competition/encounter-change/encounter-change-date.model.ts` — remove `selected` field, add `proposedBy: ChangeEncounterParty` and `status: ChangeEncounterDateStatus` columns; update `EncounterChangeDateUpdateInput` and `EncounterChangeDateNewInput` accordingly
- [x] T007 Add new input types `ProposeEncounterChangeDatesInput`, `ProposedDateInput`, `TriageEncounterChangeInput`, `FinalizeEncounterChangeInput` to `packages/backend-graphql/src/resolvers/event/competition/encounter-change.resolver.ts` (or a co-located input file)
- [x] T008 Add new result types `ProposeEncounterChangeDatesResult`, `TriageEncounterChangeResult`, `FinalizeEncounterChangeResult` as `@ObjectType` classes in `packages/backend-graphql/src/resolvers/event/competition/encounter-change.resolver.ts`

**Checkpoint**: Enums, migration, updated models, and input/result types ready — user stories can now proceed.

---

## Phase 2: User Story 1 — Home Team Proposes Multiple Dates (Priority: P1) 🎯 MVP

**Goal**: Either party with `change:encounter` permission can submit one or more candidate dates. Dates append without replacing existing ones.

**Independent Test**: Call `proposeEncounterChangeDates` with 2 dates as a home club admin → both rows present with `status=PENDING`, `proposedBy=HOME`, `lastActionBy=HOME`.

- [x] T009 [US1] Implement `proposeEncounterChangeDates` mutation in `packages/backend-graphql/src/resolvers/event/competition/encounter-change.resolver.ts`:
  - Resolve party (HOME/AWAY) via `user.hasAnyPermission([homeClubId + '_change:encounter'])`
  - Guard deadline: `event.changeCloseRequestDatePeriodN`
  - Validate season bounds (Sep 1 – Apr 30) per date
  - Deduplicate against non-REJECTED existing dates
  - `findOrCreate` `EncounterChange` by `encounterId`
  - INSERT `EncounterChangeDate` rows: `status=PENDING`, `proposedBy=<party>`
  - UPDATE `EncounterChange.lastActionBy/lastActionAt`
  - Notify opposing team captain (`team.captainId`)
  - Wrap in Sequelize transaction with commit/rollback
- [x] T010 [US1] Add unit test cases for `proposeEncounterChangeDates` in `packages/backend-graphql/src/resolvers/event/competition/encounter-change.resolver.spec.ts`:
  - Home party can propose dates → rows inserted with correct fields
  - Away party can also propose dates
  - Deadline passed → throws `DEADLINE_PASSED`
  - Date outside season → throws `DATE_OUT_OF_SEASON`
  - Duplicate date → throws `DUPLICATE_DATE`
  - Unauthenticated → `UnauthorizedException`
  - Transaction rolls back on error

**Checkpoint**: Home (and away) can propose dates. Away team sees them as `PENDING`.

---

## Phase 3: User Story 2 — Away Team Triages Proposed Dates (Priority: P1)

**Goal**: Away team submits a single combined action: endorse, reject, and/or add counter-dates. One `lastActionBy` update, one notification.

**Independent Test**: Call `triageEncounterChange` with `endorseIds=[date1]`, `rejectIds=[date2]`, `newDates=[{date}]` as away club admin → date1 is `TENTATIVELY_ACCEPTED`, date2 is `REJECTED`, new date inserted with `proposedBy=AWAY`, `lastActionBy=AWAY`, home team notified once.

- [x] T011 [US2] Implement `triageEncounterChange` mutation in `packages/backend-graphql/src/resolvers/event/competition/encounter-change.resolver.ts`:
  - Verify actor is AWAY (else `PERMISSION_DENIED`)
  - Load `EncounterChange` + all dates
  - In transaction:
    - `endorseIds` → `TENTATIVELY_ACCEPTED` (validate source is `PENDING`)
    - `rejectIds` → `REJECTED` (validate source is `PENDING` or `TENTATIVELY_ACCEPTED`)
    - `newDates` → INSERT with `status=PENDING`, `proposedBy=AWAY`, validate season bounds
    - UPDATE `lastActionBy=AWAY`, `lastActionAt=NOW()`
  - Single notification to home team captain
- [x] T012 [US2] Add unit test cases for `triageEncounterChange` in `packages/backend-graphql/src/resolvers/event/competition/encounter-change.resolver.spec.ts`:
  - Full triage (endorse + reject + new date) applies atomically
  - Home party calling → `PERMISSION_DENIED`
  - Endorsing a non-PENDING date → `INVALID_STATE`
  - Rejecting an ACCEPTED date → `INVALID_STATE`
  - Counter-date outside season → `DATE_OUT_OF_SEASON`
  - Partial triage (only endorseIds) leaves unaddressed dates as `PENDING`
  - Transaction rolls back on error

**Checkpoint**: Away team can triage. Home team sees updated states.

---

## Phase 4: User Story 3 — Home Team Finalizes the Encounter Move (Priority: P1)

**Goal**: Home team selects one endorsed date to officially move the encounter. Full validation runs. `encounter.date` updated on success.

**Independent Test**: Call `finalizeEncounterChange` with a `TENTATIVELY_ACCEPTED` date as home club admin → selected date is `ACCEPTED`, siblings are `RESOLVED`, `encounter.date` updated.

- [x] T013 [US3] Activate `LocationRule` in `packages/backend-competition/change-encounter/src/services/validate/encounter.service.ts` — change `activated: false` to `activated: true`
- [x] T014 [US3] Implement `finalizeEncounterChange` mutation in `packages/backend-graphql/src/resolvers/event/competition/encounter-change.resolver.ts`:
  - Verify actor is HOME (else `PERMISSION_DENIED`)
  - Load `EncounterChangeDate` → must be `TENTATIVELY_ACCEPTED` or `proposedBy=AWAY` (else `DATE_NOT_ENDORSED`)
  - Run `EncounterValidationService.validate()` — LocationRule active, original slot still occupied (Option A)
  - In transaction:
    - Selected date → `ACCEPTED`
    - All sibling `PENDING`/`TENTATIVELY_ACCEPTED` → `RESOLVED`; `REJECTED` unchanged
    - `encounter.date = proposedDate`
    - Set `encounter.originalDate` if not already set
    - Update `encounter.locationId` if date carries one
    - Enqueue sync job
  - Notify both parties
- [x] T015 [US3] Add unit test cases for `finalizeEncounterChange` in `packages/backend-graphql/src/resolvers/event/competition/encounter-change.resolver.spec.ts`:
  - `TENTATIVELY_ACCEPTED` date → accepted, siblings resolved, encounter.date updated
  - Away-proposed date (`proposedBy=AWAY`) → same outcome
  - `PENDING` date (not endorsed) → `DATE_NOT_ENDORSED`
  - Away party calling → `PERMISSION_DENIED`
  - Validation failure → error returned, encounter.date unchanged
  - `encounter.originalDate` preserved if already set
  - Transaction rolls back on validation error

**Checkpoint**: Full propose → triage → finalize flow is functional end-to-end.

---

## Phase 5: User Story 4 — Per-Viewer `changeStatus` Field (Priority: P2)

**Goal**: Encounter list exposes a per-viewer status field so each party sees the correct turn indicator without extra client logic.

**Independent Test**: After each action in the flow, `EncounterCompetition.changeStatus` returns the correct value for each party independently (see spec §8 acceptance scenarios).

- [x] T016 [US4] Add `@ResolveField(() => String, { nullable: true })` named `changeStatus` to `EncounterCompetitionResolver` in `packages/backend-graphql/src/resolvers/event/competition/encounter.resolver.ts`:
  - Use `@Parent() encounter: EncounterCompetition` + `@User() user: Player`
  - Load `encounterChange` with `dates` via `encounter.getChange({ include: [EncounterChangeDate] })` if not already loaded
  - Resolve HOME/AWAY party via `user.hasAnyPermission([homeTeam.clubId + '_change:encounter'])`
  - Derive status per logic in `data-model.md` (null → MOVED → PROPOSAL_SENT/ACTION_REQUIRED → REJECTED_WAITING)
- [x] T017 [US4] Add unit test cases for `changeStatus` in `packages/backend-graphql/src/resolvers/event/competition/encounter.resolver.spec.ts`:
  - No change request → null
  - An ACCEPTED date exists → `MOVED`
  - Live dates, `lastActionBy === viewer` → `PROPOSAL_SENT`
  - Live dates, `lastActionBy !== viewer` → `ACTION_REQUIRED`
  - All REJECTED, `lastActionBy === viewer` → `ACTION_REQUIRED`
  - All REJECTED, `lastActionBy !== viewer` → `REJECTED_WAITING`
  - Anonymous user (no permission) → treated as AWAY

**Checkpoint**: Encounter list shows correct per-viewer status for all states.

---

## Phase 6: User Story 5 — Per-Date Validation Symbols (Priority: P3)

**Goal**: Each proposed date in `EncounterChangeDate` shows `availabilityHome`/`availabilityAway` computed at read time, so the receiving party can triage without leaving the page.

**Independent Test**: An `EncounterChangeDate` with a conflicting home venue date returns `availabilityHome=NOT_POSSIBLE`; a free date returns `availabilityHome=POSSIBLE`.

- [x] T018 [US5] ~~Verify that `availabilityHome` and `availabilityAway` are populated at read time (not stored).~~ **N/A** — fields are stored DB columns (no `@ResolveField`); no conflict with new `status`/`proposedBy` fields; no patch needed. New mutations leave these null (old `addChangeEncounter` flow still writes them).
- [x] T019 [US5] ~~Add unit tests for computed availability symbols.~~ **N/A** — no computation to test; fields are stored columns returned as-is by the `dates` ResolveField. Added pass-through tests for `dates()` resolver instead.

**Checkpoint**: Proposed dates show venue availability symbols for easy triage.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T020 [P] Mark `addChangeEncounter` mutation as `@deprecated` (add GraphQL `@deprecated` directive and JSDoc `@deprecated` comment) in `packages/backend-graphql/src/resolvers/event/competition/encounter-change.resolver.ts`. Do NOT remove — keep functional for frontend migration.
- [x] T021 [P] Update `EncounterChangeUpdateInput` in `packages/backend-database/src/models/event/competition/encounter-change/encounter-change.model.ts` to remove the `accepted` and `home` fields (now redundant); keep other fields intact.
- [x] T022 Run `pnpm turbo run test --filter=@badman/backend-graphql` and verify all existing + new tests pass
- [x] T023 Run `pnpm turbo run test --filter=@badman/backend-competition-change-encounter` and verify `LocationRule` activation does not break existing validation tests
- [x] T024 Run `npx sequelize-cli db:migrate` against local dev DB and verify the migration applies cleanly; run `db:migrate:undo` and re-apply to verify `down` works

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundational)**: No dependencies — start immediately
- **Phase 2 (US1)**: Depends on Phase 1 complete
- **Phase 3 (US2)**: Depends on Phase 1 complete; can start in parallel with Phase 2
- **Phase 4 (US3)**: Depends on Phase 1 complete; can start in parallel with Phase 2 and 3
- **Phase 5 (US4)**: Depends on Phase 1 complete (models); ideally after Phase 2–4 for meaningful integration test
- **Phase 6 (US5)**: Depends on Phase 1 complete; independent of Phase 2–5
- **Phase 7 (Polish)**: Depends on all phases above complete

### Parallel Opportunities

```bash
# Phase 1 — run in parallel:
T001  # ChangeEncounterParty enum
T002  # ChangeEncounterDateStatus enum
T003  # EncounterChangeViewState enum

# After Phase 1 complete — user stories can run in parallel:
Phase 2 (US1: propose)
Phase 3 (US2: triage)
Phase 4 (US3: finalize)
Phase 5 (US4: changeStatus)
Phase 6 (US5: symbols)
```

---

## Implementation Strategy

### MVP (P1 Stories Only — Phases 1–4)

1. Complete Phase 1 (Foundational) — enums, migration, model updates
2. Phase 2 (US1: propose) → test independently
3. Phase 3 (US2: triage) → test independently
4. Phase 4 (US3: finalize) → test full flow end-to-end
5. **STOP and VALIDATE**: Full propose → triage → finalize works

### Full Delivery (All Stories)

6. Phase 5 (US4: changeStatus) → test per-viewer status
7. Phase 6 (US5: per-date symbols) → test venue availability
8. Phase 7 (Polish) → deprecate old mutation, run all tests
