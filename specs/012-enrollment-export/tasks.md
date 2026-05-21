# Tasks: Enrollment Export — REST Endpoint Migration

**Input**: Design documents from `specs/012-enrollment-export/`
**Branch**: `012-enrollment-export`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Wire the new service into the application module so the rest of the implementation compiles.

- [X] T001 Register `EnrollmentService` in `AppModule.providers` and inject into `ExportController` constructor in `apps/api/src/app/app.module.ts` and `apps/api/src/app/controllers/export.controller.ts`

---

## Phase 2: User Story 1 — Core Export Functionality (Priority: P1) 🎯 MVP

**Goal**: Authenticated users with `edit:competition` can call `GET /export/enrollment?eventId={id}` and receive a correctly structured XLSX or CSV file with one row per enrolled player, 12 columns in order, ordered by sub-event type → level → team name → player sort order.

**Independent Test**: `GET /export/enrollment?eventId={valid-id}&format=xlsx` with a valid auth token → HTTP 200, `Content-Type` XLSX, sheet `Enrollment`, 12 columns in order, one data row per enrolled player. Same with `format=csv` → HTTP 200, `Content-Type: text/csv`.

- [X] T002 [US1] Create `EnrollmentService` in `apps/api/src/app/services/export/enrollment.service.ts` with:
  - `getEnrollment(eventId)` method: fetch `EventCompetition.findByPk(eventId)`, throw `NotFoundException` if absent; traverse `getSubEventCompetitions({ order: [["eventType","ASC"],["level","ASC"]] })` → `getDrawCompetitions()` → `getEventEntries({ include: [Team], order: [["team","name","ASC"]] })`; collect all `meta.competition.players[].id` values; resolve with single `Player.findAll({ where: { id: playerIds } })` into a `Map<string, Player>`; build rows via `getPlayerEntry()`; return `{ headers, rows, eventName }`
  - `getPlayerEntry(player, team, single, double, mix, subEventName, drawName, isMixed, teamIndex)` private method: returns 12-column array matching `["Naam","Voornaam","Lidnummer","Geslacht","Ploeg","Enkel","Dubbel","Gemengd","Afdeling","Reeks","Somindex gemengde competitie","Somindex heren-/damescompetitie"]`; `Ploeg` = `${team.name} (${teamIndex})`; `Reeks` = `drawName.replace(subEventName,"").replace("-","").trim()`; MX: sum-index col 10 = `single+double+mix`, col 11 = `""`; non-MX: col 10 = `""`, col 11 = `single+double`
  - Entry with no team: `this.logger.warn(...)` + `continue` (no throw)
  - Unresolvable player ID: `continue` silently
  - HEADERS constant: `["Naam","Voornaam","Lidnummer","Geslacht","Ploeg","Enkel","Dubbel","Gemengd","Afdeling","Reeks","Somindex gemengde competitie","Somindex heren-/damescompetitie"]`
- [X] T003 [US1] Add `getEnrollment()` handler to `ExportController` in `apps/api/src/app/controllers/export.controller.ts` following the exact same structure as `getTeams()`, `getExceptions()`, and `getLocations()`: auth guards → `getExportFormat(query)` → `IsUUID` check → `enrollmentService.getEnrollment(eventId)` → `buildExportPayload("Enrollment", headers, rows)` → set `Content-Disposition: attachment; filename="{eventName}-enrollment.{ext}"`
- [X] T004 [P] [US1] Write `enrollment.service.spec.ts` in `apps/api/src/app/services/export/enrollment.service.spec.ts` covering:
  - Returns 12 headers in correct order
  - Returns `eventName` from the competition
  - Single player entry → exactly 1 row with correct column values
  - Entry with no team → 0 rows, warning logged (spy on `logger.warn`)
  - Unknown player ID (not in map) → player row skipped (0 rows)
  - MX sub-event → col index 10 = `single+double+mix`, col index 11 = `""`
  - Non-MX sub-event → col index 10 = `""`, col index 11 = `single+double`
  - Draw name cleaned: `"Heren - Groep 1"` with subEventName `"Heren"` → `"Groep 1"` in Reeks column
  - `NotFoundException` when `EventCompetition` does not exist

**Checkpoint**: `npx jest --testPathPattern=enrollment.service.spec` — all tests pass.

---

## Phase 3: User Story 2 — Endpoint Security (Priority: P1)

**Goal**: Unauthenticated callers get 401; authenticated callers without `edit:competition` get 403.

**Independent Test**: Request without token → 401. Request with token lacking permission → 403.

- [X] T005 [US2] Add auth guards to the `getEnrollment()` handler in `apps/api/src/app/controllers/export.controller.ts`:
  - `if (!user?.id) throw new UnauthorizedException('Login required')`
  - `if (!(await user.hasAnyPermission(['edit:competition']))) throw new ForbiddenException('Insufficient permissions')`
  - Both checks MUST appear before `getExportFormat` or any service call

---

## Phase 4: User Story 3 — Input Validation (Priority: P1)

**Goal**: Missing, malformed, or non-existent `eventId` and unknown `format` values rejected before any DB work.

**Independent Test**: No `eventId` → 400. Non-UUID `eventId` → 400. Unknown `format=pdf` → 400. Valid UUID no match → 404.

- [X] T006 [US3] Add input validation to the `getEnrollment()` handler in `apps/api/src/app/controllers/export.controller.ts` following the exact same guard order as `getTeams()`:
  - `getExportFormat(query)` (throws `BadRequestException` on invalid format)
  - `if (!query.eventId || !IsUUID(query.eventId)) throw new BadRequestException(...)`
  - `NotFoundException` from `EnrollmentService.getEnrollment` propagates as HTTP 404 automatically

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T007 [P] Run `npx jest --config apps/api/jest.config.ts` and confirm all tests (teams + exceptions + locations + enrollment) pass
- [X] T008 [P] Run `prettier --check apps/api/src/app/controllers/export.controller.ts apps/api/src/app/services/export/enrollment.service.ts apps/api/src/app/services/export/enrollment.service.spec.ts` and fix any formatting issues

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (US1)**: Depends on Phase 1 — BLOCKS Phases 3 and 4
- **Phase 3 (US2)**: Depends on Phase 2 (adds guards to the handler created in T003)
- **Phase 4 (US3)**: Depends on Phase 3 (adds validation after auth guards)
- **Phase 5 (Polish)**: Depends on Phases 2–4

### Within Each Phase

- T004 (spec writing) is marked `[P]` — can be written alongside T002/T003
- T007 and T008 are both `[P]` — run in parallel

### Parallel Opportunities

```
Phase 2:  T002 → T003 (sequential — handler needs service)
          T004 can be drafted in parallel with T002/T003
Phase 5:  T007 ‖ T008  (parallel — independent checks)
```

---

## Implementation Strategy

### MVP (all three user stories are P1 — deliver together)

1. Phase 1: Register service (T001) — 5 min
2. Phase 2: Core export (T002, T003, T004) — working endpoint + tests
3. Phase 3: Security (T005) — lock down access
4. Phase 4: Validation (T006) — harden inputs
5. Phase 5: Polish (T007, T008) — verify clean

**STOP and VALIDATE**: Run the full api test suite + smoke-test the endpoint before merging.

---

## Notes

- `[P]` tasks touch different files — safe to run in parallel
- `[US*]` label maps each task to the spec user story for traceability
- `EnrollmentService` must NOT import `xlsx` directly — use `toXlsx`/`toCSV` from `@badman/backend-utils`
- Bulk player resolution: collect all `meta.competition.players[].id` across all entries first, then one `Player.findAll({ where: { id: playerIds } })`, build `Map<string, Player>` for lookup
- Entry with no team: `this.logger.warn(\`Entry \${entry.id} has no team — skipping\`)` + `continue`
- Unresolvable player ID: `continue` silently (no warn needed — player data may have been deleted)
- `SubEventTypeEnum.MX` from `@badman/utils` determines which sum-index column is filled
- `sortPlayers` from `@badman/utils` for player ordering within an entry
- No new Nx lib, no new controller — additions only to existing files plus two new service files
