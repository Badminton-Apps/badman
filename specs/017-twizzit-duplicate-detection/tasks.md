# Tasks: Twizzit Duplicate Detection

**Input**: Design documents from `/specs/017-twizzit-duplicate-detection/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/queries.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Script scaffolding — CLI arg parsing, env loading, DB connection (mirrors `backfill-entry-meta.js`)

- [ ] T001 Create `scripts/detect-duplicate-players.js` with shebang, `"use strict"`, CLI arg parsing (`--env`, `--dry-run`), dotenv loading, and pg client setup mirroring `scripts/backfill-entry-meta.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure required by all detection passes

**⚠️ CRITICAL**: Must complete before any user story work begins

- [ ] T002 Implement shadow table empty guard in `scripts/detect-duplicate-players.js` — query `SELECT COUNT(*) FROM twizzit.shadow_contact`, exit code 1 with clear message if 0 rows (FR-007)
- [ ] T003 Implement `groupId` counter helpers in `scripts/detect-duplicate-players.js` — sequential `MB-N` and `NK-N` prefixed counters (FR-010)
- [ ] T004 Implement CSV writer helper in `scripts/detect-duplicate-players.js` — writes header + rows to `scripts/duplicate-report-<env>-<date>.csv` with all columns: `groupId`, `matchReason`, `twizzitId`, `memberId`, `badmanPlayerId`, `firstName`, `lastName`, `dateOfBirth`, `gender`, `email`, `missingMemberId`, `suggestedMemberId` (FR-005)

**Checkpoint**: Foundation ready — detection passes can now be implemented

---

## Phase 3: User Story 1 — Detect Badman Duplicate Players via memberId (Priority: P1) 🎯 MVP

**Goal**: Find Badman Players that are duplicates confirmed by both mapping to the same Twizzit shadow contact via `memberId`

**Independent Test**: Seed two Players with the same `memberId` in staging, run script, verify both appear in CSV with `matchReason = member-id-match` and the same `groupId`

### Implementation for User Story 1

- [ ] T005 [US1] Implement Pass 1 query in `scripts/detect-duplicate-players.js` — JOIN `twizzit.shadow_contact` ON `member_id = "memberId"` GROUP BY `twizzit_id` HAVING COUNT > 1, as per `contracts/queries.md` Q2 (FR-001, FR-003)
- [ ] T006 [US1] Expand Pass 1 results into one CSV row per Player per group in `scripts/detect-duplicate-players.js` — assign `MB-N` groupId, set `matchReason = member-id-match`, `missingMemberId = false`, `suggestedMemberId = ""` (FR-005)
- [ ] T007 [US1] Add Pass 1 stdout logging in `scripts/detect-duplicate-players.js` — print group count and affected player count after pass completes (FR-006)

**Checkpoint**: User Story 1 fully functional — memberId duplicate detection works end-to-end

---

## Phase 4: User Story 2 — Detect Badman Duplicate Players via Natural Key (Priority: P1)

**Goal**: Find duplicate Badman Players confirmed by name+DOB match to the same shadow contact, only when memberId is absent on either side

**Independent Test**: Seed two Players with matching `firstName + lastName + dateOfBirth` but no `memberId`, run script, verify both appear in CSV with `matchReason = natural-key-match`

### Implementation for User Story 2

- [ ] T008 [US2] Collect Pass 1 player IDs into an exclusion set in `scripts/detect-duplicate-players.js` — prevent Pass 2 from re-reporting players already found via memberId (FR-001, FR-003)
- [ ] T009 [US2] Implement Pass 2 query in `scripts/detect-duplicate-players.js` — JOIN on `lower(first_name)=lower("firstName") AND lower(last_name)=lower("lastName") AND date_of_birth IS NOT DISTINCT FROM "dateOfBirth"` WHERE memberId is NULL on either side, excluding Pass 1 player IDs, as per `contracts/queries.md` Q3 (FR-002, FR-003)
- [ ] T010 [US2] Expand Pass 2 results into CSV rows in `scripts/detect-duplicate-players.js` — assign `NK-N` groupId, set `matchReason = natural-key-match`, compute `missingMemberId` and `suggestedMemberId` per row (FR-004, FR-005)
- [ ] T011 [US2] Add Pass 2 stdout logging in `scripts/detect-duplicate-players.js` — print group count, affected player count, and missing-memberId count after pass completes (FR-006)

**Checkpoint**: User Stories 1 and 2 both functional — all duplicate detection passes work

---

## Phase 5: User Story 3 — CSV Report Output (Priority: P1)

**Goal**: Write all duplicate groups to a single CSV file and print a final summary to stdout

**Independent Test**: Run script on any environment, verify CSV is written to `scripts/` with correct filename, header row, and one data row per affected player

### Implementation for User Story 3

- [ ] T012 [US3] Wire Pass 1 and Pass 2 rows into the CSV writer in `scripts/detect-duplicate-players.js` — combine both result sets, write CSV to `scripts/duplicate-report-<env>-<date>.csv` (FR-005)
- [ ] T013 [US3] Implement final stdout summary in `scripts/detect-duplicate-players.js` — print total duplicate groups, total affected players, total players flagged with missing memberId, and CSV path (FR-006)
- [ ] T014 [US3] Handle zero-results case in `scripts/detect-duplicate-players.js` — write header-only CSV and print "0 duplicate groups found" when both passes return empty (FR-006)

**Checkpoint**: All three user stories complete — script is fully functional

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T015 [P] Validate `--env prod` requires explicit flag (no accidental production runs) in `scripts/detect-duplicate-players.js` — matches pattern from `backfill-entry-meta.js`
- [ ] T016 [P] Add top-of-file JSDoc usage comment to `scripts/detect-duplicate-players.js` documenting all flags, examples, and prerequisites (spec 016 must be run first)
- [ ] T017 Run `node scripts/detect-duplicate-players.js --dry-run` locally and confirm zero errors and valid CSV output against local DB
- [ ] T018 Run `node scripts/detect-duplicate-players.js --env staging --dry-run` and confirm output matches expected staging state per `quickstart.md` workflow

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — blocks all user stories
- **Phase 3 (US1)**: Depends on Phase 2
- **Phase 4 (US2)**: Depends on Phase 2; integrates with Phase 3 (Pass 1 exclusion set)
- **Phase 5 (US3)**: Depends on Phases 3 and 4 (combines both result sets)
- **Phase 6 (Polish)**: Depends on Phase 5

### Within Each Phase

- T005 → T006 → T007 (sequential within US1)
- T008 → T009 → T010 → T011 (sequential within US2; T008 depends on T005–T007)
- T012 → T013 → T014 (sequential within US3)

### Parallel Opportunities

- T015 and T016 in Phase 6 can run in parallel
- T017 and T018 can run in parallel once T015/T016 complete

---

## Parallel Example: Phase 6

```bash
# Run in parallel:
Task: "T015 - Validate --env prod flag guard in scripts/detect-duplicate-players.js"
Task: "T016 - Add JSDoc usage comment to scripts/detect-duplicate-players.js"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 (memberId duplicate detection)
4. **STOP and VALIDATE**: Run against staging — confirm MB groups appear correctly
5. Continue to Phase 4 → Phase 5 → Phase 6

### Incremental Delivery

1. Phase 1 + 2 → script boots and guards correctly
2. Phase 3 → memberId duplicate detection works, CSV writes MB groups
3. Phase 4 → natural-key fallback works, missing memberId flagged
4. Phase 5 → final CSV + summary complete
5. Phase 6 → polish, docs, staging validation
