# Tasks: Teams Export — Backend Endpoint

**Input**: Design documents from `specs/009-teams-export/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/teams-export.md

**Scope**: Add `GET /export/teams` to the API app. Enrollment lib is not touched.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup — ExportController in API App

**Purpose**: Create the controller skeleton and service file, wire into AppModule. Must be complete before any user story work begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T001 Create `apps/api/src/app/controllers/export.controller.ts` — `@Controller({ path: 'export' })` with shared guard order: 401 → 403 → 400 (format) → 400 (UUID) → 404; stub `GET teams` route handler
- [ ] T002 Create `apps/api/src/app/services/export/teams.service.ts` — empty `getTeams(eventId: string)` stub returning `{ headers, rows, eventName }`
- [ ] T003 Add `ExportController` to `apps/api/src/app/controllers/index.ts` exports
- [ ] T004 Add `ExportController` to `controllers` array in `apps/api/src/app/app.module.ts`

**Checkpoint**: `GET /api/export/teams` responds (even if empty) — controller is wired and reachable

---

## Phase 2: User Story 1 — Download Teams Export (Priority: P1) 🎯 MVP

**Goal**: `GET /export/teams?eventId={uuid}&format=xlsx|csv` returns a deduplicated XLSX or CSV of all enrolled teams with Dutch day names and HH:mm time formatting.

**Independent Test**: Authenticated request with valid `eventId` → HTTP 200, correct `Content-Type`, sheet name `Teams`, 5 columns in order, one row per unique team, `preferredDay` as Dutch name, `preferredTime` as `HH:mm`.

### Implementation

- [ ] T005 [P] [US1] Implement `apps/api/src/app/services/export/teams.service.ts` — `getTeams(eventId)` traverses `EventCompetition → SubEventCompetition[] → DrawCompetition[] → EventEntry[] (include Team → Club)`; deduplicates by `team.id` using `Set<string>`; translates `preferredDay` via inline `DAY_NAMES` map; formats `preferredTime` as `HH:mm` (slice `"HH:mm:ss"`); returns `{ headers, rows, eventName }`
- [ ] T006 [US1] Implement `GET teams` route in `apps/api/src/app/controllers/export.controller.ts` — call `TeamsService.getTeams`, apply `toXlsx("Teams", headers, rows)` or `toCSV(headers, rows)` from `@badman/backend-utils`, set `Content-Disposition: attachment; filename="{eventName}.{ext}"`

### Tests

- [ ] T007 [P] [US1] Create `apps/api/src/app/services/export/teams.service.spec.ts` — mock `EventCompetition.findByPk` and association getters via `jest.spyOn`; verify: 5 headers in correct order, team enrolled in 2 draws appears once, `"monday"` → `"Maandag"`, `"09:00:00"` → `"09:00"`, null values → `""`
- [ ] T008 [US1] Create `apps/api/src/app/controllers/export.controller.spec.ts` (happy path) — mock `TeamsService`; test: XLSX `Content-Type`, CSV `Content-Type`, missing `format` defaults to XLSX, `Content-Disposition` contains event name

**Checkpoint**: `GET /export/teams?eventId={valid}&format=xlsx` and `format=csv` return 200 with correct file, Dutch day names, and HH:mm times

---

## Phase 3: User Story 2 — Endpoint Security (Priority: P1)

**Goal**: Unauthenticated and unauthorised callers are rejected before any data is read.

**Independent Test**: No token → 401. Valid token without `edit:competition` → 403. `TeamsService` not called in either case.

### Tests

- [ ] T009 [P] [US2] Add to `apps/api/src/app/controllers/export.controller.spec.ts`: `null` user id → `UnauthorizedException` (401); user with `hasAnyPermission` returning `false` → `ForbiddenException` (403); verify `TeamsService.getTeams` not called in both cases

**Checkpoint**: 401 and 403 covered by automated tests; `TeamsService` never invoked on failed auth

---

## Phase 4: User Story 3 — Input Validation (Priority: P1)

**Goal**: Invalid `eventId` and unknown `format` values are rejected before any DB access.

**Independent Test**: Empty `eventId` → 400. Non-UUID → 400. `format=pdf` → 400. Valid UUID with no competition → 404.

### Tests

- [ ] T010 [P] [US3] Add to `apps/api/src/app/controllers/export.controller.spec.ts`: empty `eventId` → 400; non-UUID `eventId` → 400; `format=pdf` → 400; valid UUID + `findByPk` returns `null` → 404

**Checkpoint**: SC-001 fully satisfied — automated tests cover 401, 403, 400 (three cases), and 404

---

## Phase 5: Polish & Verification

- [ ] T011 Run `npx jest --config apps/api/jest.config.ts --testPathPattern="export"` — all export tests passing
- [ ] T012 [P] Run `nx lint api` — no errors
- [ ] T013 [P] Run `prettier --write apps/api/src/app/controllers/export.controller.ts apps/api/src/app/services/export/`
- [ ] T014 Manually verify with curl scenarios from `specs/009-teams-export/quickstart.md` against local server

---

## Dependencies & Execution Order

- **Phase 1**: No dependencies — start immediately
- **Phase 2**: Depends on Phase 1 (controller + service stubs must exist)
- **Phase 3 + 4**: Depend on Phase 2 (add tests to spec file created in T008)
- **Phase 5**: Depends on Phases 2, 3, 4 complete

### Parallel Opportunities

- T005 (service impl) + T007 (service spec) — parallel, same file written together
- T006 (route impl) — after T005
- T008 (controller spec happy path) — after T006
- T009 + T010 — parallel additions to the same spec file, after T008
- T011, T012, T013 — all parallel in Phase 5

---

## Implementation Strategy

### MVP (minimum to have a working endpoint)

1. Phase 1: wire controller into API app
2. Phase 2: implement service + route + happy-path tests
3. **Validate**: `GET /export/teams` returns correct file end-to-end
4. Add Phases 3 + 4 for full test coverage

---

## Notes

- Enrollment lib (`@badman/backend-enrollment`) is **not touched** in this spec
- `ExportController` follows the exact same pattern as `CpController` in `apps/api/src/app/controllers/`
- `TeamsService` has no NestJS DI injection — pure Sequelize traversal, same pattern as `ExcelService.GetEnrollment`
- Day-name map is an inline `const` in `TeamsService` — no i18n or `translation-manager` needed
