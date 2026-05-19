# Tasks: Exceptions Export — Backend Endpoint

**Input**: Design documents from `specs/010-exceptions-export/`
**Branch**: `010-exceptions-export`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Wire the new service into the application module so the rest of the
implementation compiles.

- [X] T001 Register `ExceptionsService` in `AppModule.providers` and inject into `ExportController` constructor in `apps/api/src/app/app.module.ts` and `apps/api/src/app/controllers/export.controller.ts`

---

## Phase 2: Foundational — Refactor `TeamsService`

**Purpose**: Remove the nested async loop pattern from the existing `TeamsService`
before introducing the same query shape in `ExceptionsService`. Doing this first
ensures the pattern is proven and the test mock strategy is validated.

**⚠️ CRITICAL**: Complete this phase before US1 — the `EventEntry.findAll` query
shape used here is the same one `ExceptionsService` will use.

- [X] T002 Refactor `TeamsService.getTeams()` to query `EventEntry.findAll` with a nested `SubEventCompetition` `where: { eventId }` (required join, `attributes: []`) plus a `Team → Club` include, replacing the three-level `getSubEventCompetitions → getDrawCompetitions → getEventEntries` async loop chain in `apps/api/src/app/services/export/teams.service.ts`
- [X] T003 Update `teams.service.spec.ts` to mock `EventEntry.findAll` instead of the `EventCompetition.findByPk` + chained association mocks; keep all existing assertions green in `apps/api/src/app/services/export/teams.service.spec.ts`

**Checkpoint**: Run `npx jest --testPathPattern=teams.service.spec` — all tests pass with the new query shape.

---

## Phase 3: User Story 1 — Core Export Functionality (Priority: P1) 🎯 MVP

**Goal**: Authenticated users with `export-exceptions:competition` can call
`GET /export/exceptions?eventId={id}` and receive a correctly structured XLSX or CSV
file with one row per calendar day per location exception, deduplicated.

**Independent Test**: `GET /export/exceptions?eventId={valid-id}&format=xlsx` with a
valid auth token → HTTP 200, `Content-Type` XLSX, sheet `Exceptions`, 5 columns in order,
one row per unique `(clubId, locationName, date)`. Same with `format=csv` → HTTP 200,
`Content-Type: text/csv`.

- [X] T004 [US1] Create `ExceptionsService` in `apps/api/src/app/services/export/exceptions.service.ts` with:
  - `expandException(start, end)` helper using `eachDayOfInterval` from `date-fns`; when `end` is absent set `endDate = startDate` (not a new allocation)
  - `formatBelgianDate(date)` helper using `toZonedTime` + `format` from `date-fns-tz` with `timeZone: 'Europe/Brussels'`, output `dd/MM/yyyy`
  - `getExceptions(eventId)` method: `EventEntry.findAll` with nested `SubEventCompetition where: { eventId }` (required join) + `Team → Club → Location → Availability` include; iterate entries, expand each `availability.exception` via `expandException`, build composite key `${club.clubId}|${location.name}|${formattedDate}` for dedup Set; `Velden` = `exception.courts ?? ""`; return `{ headers, rows, eventName }`
  - HEADERS constant: `["Club ID", "Clubnaam", "Locatie", "Datum", "Velden"]`
- [X] T005 [US1] Add `getExceptions()` handler to `ExportController` in `apps/api/src/app/controllers/export.controller.ts` following the exact same structure as `getTeams()`: `format` param (default `xlsx`), call `exceptionsService.getExceptions(eventId)`, apply `toXlsx("Exceptions", headers, rows)` or `toCSV(headers, rows)`, set `Content-Disposition: attachment; filename="{eventName}-exceptions.xlsx"` (or `.csv`)
- [X] T006 [P] [US1] Write `exceptions.service.spec.ts` in `apps/api/src/app/services/export/exceptions.service.spec.ts` covering:
  - Returns 5 headers in correct order
  - Returns `eventName` from the competition
  - Single-day exception (no `end`) → exactly 1 row
  - Multi-day exception (e.g. 3-day range) → exactly 3 rows
  - Deduplication: same `(clubId, locationName, date)` from two different draws → 1 row
  - Belgian date formatting: Christmas 2024 → `"25/12/2024"`
  - Timezone correctness: a UTC date near midnight that falls on a different calendar day under `Europe/Brussels` renders with the Brussels date
  - Empty `exceptions` array → zero rows (headers-only result)
  - Club with no locations → skipped gracefully, no error
  - `courts` absent → `""` in Velden column
  - `NotFoundException` when `EventCompetition` does not exist

**Checkpoint**: `npx jest --testPathPattern=exceptions.service.spec` — all tests pass.

---

## Phase 4: User Story 2 — Endpoint Security (Priority: P1)

**Goal**: Unauthenticated callers get 401; authenticated callers without
`export-exceptions:competition` get 403. No data is read until both checks pass.

**Independent Test**: Request without token → 401. Request with token lacking the
permission → 403. Request with correct token → proceeds to data lookup (no auth error).

- [X] T007 [US2] Add auth guards to the `getExceptions()` handler in `apps/api/src/app/controllers/export.controller.ts`:
  - `if (!user?.id) throw new UnauthorizedException('Login required')`
  - `if (!(await user.hasAnyPermission(['export-exceptions:competition']))) throw new ForbiddenException('Insufficient permissions')`
  - Both checks MUST appear before any `query` access or service call

**Checkpoint**: Manual smoke-test with no token → 401; wrong permission → 403.

---

## Phase 5: User Story 3 — Input Validation (Priority: P1)

**Goal**: Missing, malformed, or non-existent `eventId` and unknown `format` values
are rejected with structured HTTP errors before any database work begins.

**Independent Test**: No `eventId` → 400. Non-UUID `eventId` → 400. Valid UUID with no
matching competition → 404. Unknown `format` → 400.

- [X] T008 [US3] Add input validation to the `getExceptions()` handler in `apps/api/src/app/controllers/export.controller.ts` following the exact same guard order as `getTeams()`:
  - `if (!VALID_FORMATS.includes(format)) throw new BadRequestException(...)`
  - `if (!query.eventId || !IsUUID(query.eventId)) throw new BadRequestException(...)`
  - `NotFoundException` from `ExceptionsService.getExceptions` propagates as HTTP 404 automatically via NestJS

**Checkpoint**: `GET /export/exceptions` without `eventId` → 400; with `eventId=not-a-uuid` → 400; with unknown `format=pdf` → 400.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T009 [P] Run `npx jest --config apps/api/jest.config.ts` and confirm all tests (teams + exceptions) pass
- [X] T010 [P] Run `prettier --check apps/api/src/app/controllers/export.controller.ts apps/api/src/app/services/export/exceptions.service.ts apps/api/src/app/services/export/exceptions.service.spec.ts apps/api/src/app/services/export/teams.service.ts apps/api/src/app/services/export/teams.service.spec.ts` and fix any formatting issues

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS Phase 3
- **Phase 3 (US1)**: Depends on Phase 2
- **Phase 4 (US2)**: Depends on Phase 3 (adds guards to the handler created in T005)
- **Phase 5 (US3)**: Depends on Phase 4 (adds validation after auth guards)
- **Phase 6 (Polish)**: Depends on Phases 3–5

### Within Each Phase

- T006 (spec writing) is marked `[P]` — can be written alongside T004/T005
- T009 and T010 are both `[P]` — run in parallel

### Parallel Opportunities

```
Phase 2:  T002 → T003 (sequential — spec must reflect new shape)
Phase 3:  T004 → T005 (sequential — handler needs service)
          T006 can be drafted in parallel with T004/T005
Phase 6:  T009 ‖ T010  (parallel — independent checks)
```

---

## Implementation Strategy

### MVP (all three user stories are P1 — deliver together)

1. Phase 1: Register service (T001) — 5 min
2. Phase 2: Refactor TeamsService (T002, T003) — establishes query pattern
3. Phase 3: Core export (T004, T005, T006) — working endpoint + tests
4. Phase 4: Security (T007) — lock down access
5. Phase 5: Validation (T008) — harden inputs
6. Phase 6: Polish (T009, T010) — verify clean

**STOP and VALIDATE**: Run the full api test suite + smoke-test the endpoint before merging.

---

## Notes

- `[P]` tasks touch different files — safe to run in parallel
- `[US*]` label maps each task to the spec user story for traceability
- All date logic MUST use `date-fns` / `date-fns-tz` — no `moment`, no manual `setDate` loop
- The `ExceptionsService` must NOT import `xlsx` directly — use `toXlsx`/`toCSV` from `@badman/backend-utils`
- No new Nx lib, no new controller — additions only to existing files plus two new service files
