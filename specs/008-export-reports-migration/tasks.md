---

description: "Task list for Export Foundation — Security Hardening & Shared Export Utility"
---

# Tasks: Export Foundation — Security Hardening & Shared Export Utility

**Input**: Design documents from `specs/008-export-reports-migration/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Test tasks are included — the spec calls for automated coverage of all
auth/validation error cases and utility unit tests (SC-001, SC-003, SC-004).

**Organization**: Phases map to the three user stories in spec.md.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: US1 = Protect endpoint / US2 = Input validation / US3 = Shared utility

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add `xlsx` to `@badman/backend-utils` and create the utility file
stub so downstream phases can import it.

- [ ] T001 Add `xlsx` dependency to `libs/backend/utils/package.json`
- [ ] T002 Create stub file `libs/backend/utils/src/export.util.ts` exporting the `Row` type and empty function signatures for `toXlsx`, `toCSV`
- [ ] T003 Export `export.util.ts` from `libs/backend/utils/src/index.ts`

---

## Phase 2: Foundational — Shared Export Utility (US3)

**Purpose**: Implement and test the shared export utility. Required before the
enrollment service refactor in Phase 4.

**Goal**: Pure functions for XLSX and CSV generation, independently testable with
no database or NestJS context.

**Independent Test**: `npx jest --config libs/backend/utils/jest.config.ts` — all
new utility tests pass, zero DB connections required.

- [ ] T004 [US3] Implement `toXlsx(sheetName, headers, rows)` in `libs/backend/utils/src/export.util.ts` — full XLSX pipeline: `book_new`, `aoa_to_sheet`, auto-size columns (max content length + 2), `!autofilter` on full range, `book_append_sheet`, `XLSX.write({ type: 'buffer', bookType: 'xlsx' })` — returns `Buffer`
- [ ] T005 [P] [US3] Implement `toCSV(headers, rows)` in `libs/backend/utils/src/export.util.ts` — RFC 4180: comma separator, CRLF line endings, double-quote escaping for values containing comma / quote / newline, null/undefined → empty string — returns `string`
- [ ] T006 [P] [US3] Write unit tests for `toXlsx` in `libs/backend/utils/src/export.util.spec.ts` — verify buffer is non-empty, parseable back to a workbook with correct sheet name, header row matches, autofilter is set, column count matches
- [ ] T007 [P] [US3] Write unit tests for `toCSV` in `libs/backend/utils/src/export.util.spec.ts` — verify comma separation, CRLF endings, quoting of values with commas/quotes/newlines, empty string for null/undefined

**Checkpoint**: `npx jest --config libs/backend/utils/jest.config.ts` passes. Shared utility is ready for consumers.

---

## Phase 3: User Story 1 — Protect the Enrollment Endpoint

**Goal**: `GET /excel/enrollment` rejects unauthenticated (401) and unauthorized
(403) requests before any data is touched.

**Independent Test**: `curl` without token → 401; `curl` with token missing
`edit:competition` → 403; `curl` with correct token + valid `eventId` → 200 XLSX.

- [ ] T013 [US1] Add `@User() user: Player` parameter and two-step auth check to `getBaseplayersEnrollment` in `libs/backend/competition/enrollment/src/controllers/excel.controller.ts`: `if (!user?.id) throw new UnauthorizedException(...)` then `if (!(await user.hasAnyPermission(['edit:competition']))) throw new ForbiddenException(...)`
- [ ] T014 [P] [US1] Write controller unit tests for auth cases in `libs/backend/competition/enrollment/src/controllers/excel.controller.spec.ts` — test: no user → 401, user without permission → 403, user with permission → proceeds to service call (mock service to return dummy buffer)

**Checkpoint**: Auth tests pass. Unauthenticated requests return 401, unauthorized return 403.

---

## Phase 4: User Story 2 — Input Validation

**Goal**: `GET /excel/enrollment` returns 400 for missing/invalid `eventId` and
404 for a UUID that matches no competition.

**Independent Test**: Three `curl` calls with (a) no `eventId`, (b) non-UUID,
(c) non-existent UUID all return structured error responses, not 500.

- [ ] T015 [US2] Add UUID format validation to `getBaseplayersEnrollment` in `libs/backend/competition/enrollment/src/controllers/excel.controller.ts` — `if (!query.eventId || !isUUID(query.eventId)) throw new BadRequestException(...)` (import `isUUID` from `class-validator`)
- [ ] T016 [US2] Add existence check to `getBaseplayersEnrollment` in `libs/backend/competition/enrollment/src/controllers/excel.controller.ts` — call `EventCompetition.findByPk(query.eventId)` before the service call; `if (!event) throw new NotFoundException(...)`
- [ ] T017 [P] [US2] Write controller unit tests for validation cases in `libs/backend/competition/enrollment/src/controllers/excel.controller.spec.ts` — test: missing eventId → 400, non-UUID string → 400, valid UUID not found → 404, valid UUID found → proceeds to service

**Checkpoint**: Validation tests pass. All error cases return correct HTTP codes.

---

## Phase 5: User Story 3 (cont.) — Refactor Enrollment Service

**Goal**: Replace inline XLSX block in `ExcelService.GetEnrollment` with shared
utility calls. Data assembly logic unchanged — only the workbook/buffer
construction is replaced. Output is regression-identical.

**Independent Test**: Download the enrollment XLSX before and after the refactor
for the same competition. Same sheet name (`Enrollment`), same 12 columns, same
row count, same cell values.

- [ ] T018 [US3] Refactor `GetEnrollment` in `libs/backend/competition/enrollment/src/services/excel.services.ts` — replace `XLSX.utils.book_new()` / `aoa_to_sheet` / auto-size / autofilter / `book_append_sheet` / `XLSX.write` block with `toXlsx('Enrollment', headers, rows)` imported from `@badman/backend-utils`. Remove `xlsx` import from the service file.
- [ ] T019 [US3] Write regression unit test for `GetEnrollment` in `libs/backend/competition/enrollment/src/services/excel.services.spec.ts` — mock Sequelize model statics (`jest.spyOn`), verify returned buffer is non-empty, parse buffer back to workbook and assert sheet name is `Enrollment`, column count is 12, and header row matches exactly: `['Naam','Voornaam','Lidnummer','Geslacht','Ploeg','Enkel','Dubbel','Gemengd','Afdeling','Reeks','Somindex gemengde competitie','Somindex heren-/damescompetitie']`

**Checkpoint**: Refactor test passes. `nx test backend-enrollment` still fully green.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T020 [P] Run `nx test backend-enrollment` and `npx jest --config libs/backend/utils/jest.config.ts` — confirm all tests pass
- [ ] T021 [P] Run `nx lint backend-enrollment` and `nx lint backend-utils` — confirm no lint errors
- [ ] T022 Run `prettier --check libs/backend/utils/src/export.util.ts libs/backend/competition/enrollment/src/controllers/excel.controller.ts libs/backend/competition/enrollment/src/services/excel.services.ts` — fix any formatting issues
- [ ] T023 Manual smoke test per `specs/008-export-reports-migration/quickstart.md` — verify all curl scenarios (401, 403, 400-missing, 400-invalid, 404, 200)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational / US3 utility (Phase 2)**: Depends on Phase 1 (stub file must exist)
- **US1 auth (Phase 3)**: Depends on Phase 1 only — no dependency on Phase 2
- **US2 validation (Phase 4)**: Depends on Phase 3 (auth check must be in place first, validation is added after)
- **US3 refactor (Phase 5)**: Depends on Phase 2 (utility must be fully implemented)
- **Polish (Phase 6)**: Depends on Phases 3, 4, 5 all complete

### User Story Dependencies

- **US1** (auth): Depends on Phase 1 only — can start in parallel with Phase 2
- **US2** (validation): Depends on US1 being in place
- **US3 utility** (Phase 2): No story dependencies — parallel with US1
- **US3 refactor** (Phase 5): Depends on Phase 2 (utility) being done

### Within Each Phase

- Tasks marked [P] within a phase have no intra-phase dependencies and can run in parallel
- T005 (utility implementation) is parallel with T004
- T006–T007 (utility tests) are parallel once T004–T005 are done

### Parallel Opportunities

```bash
# After T001–T003 (setup complete):

# Stream A — US3 utility (Phase 2):
T004 + T005 in parallel → then T006 + T007 in parallel

# Stream B — US1 auth (Phase 3) — runs in parallel with Stream A:
Task T013 → T014

# After both streams complete:
# Stream C — US2 validation (Phase 4):
T015 → T016 → T017

# After Stream A + Stream C complete:
# Stream D — US3 refactor (Phase 5):
T018 → T019
```

---

## Implementation Strategy

### MVP Scope (minimum viable)

Complete Phases 1 + 3 + 4 only — shared utility stub exists, enrollment
endpoint is secured and validates input. The service refactor (Phase 5) can
follow immediately after but is not blocking for the security goal.

### Recommended Execution Order

1. Phase 1 (T001–T003) — 10 min
2. Phase 2 (T004–T007) in parallel with Phase 3 (T013–T014)
3. Phase 4 (T015–T017) after Phase 3
4. Phase 5 (T018–T019) after Phase 2
5. Phase 6 (T020–T023) last

---

## Notes

- [P] tasks = different files, no intra-phase dependencies
- [US?] labels map tasks to specific user stories for traceability
- Auth check (T013) must use `UnauthorizedException` (401) for no-auth and `ForbiddenException` (403) for no-permission — do NOT use `canExecute()` (see research.md Decision 1)
- Utility functions (T004–T005) are pure — no NestJS DI, no database access
- Do not change the data assembly loop in `ExcelService.GetEnrollment` — only replace the workbook/sheet/buffer construction block
- Column order in the regression test (T019) must match exactly the 12 headers in data-model.md
