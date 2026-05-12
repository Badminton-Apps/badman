# Tasks: Locations Export — Backend Endpoint

**Input**: Design documents from `specs/011-locations-export/`
**Branch**: `011-locations-export`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Wire the new service into the application module so the rest of the
implementation compiles.

- [X] T001 Register `LocationsService` in `AppModule.providers` and inject into `ExportController` constructor in `apps/api/src/app/app.module.ts` and `apps/api/src/app/controllers/export.controller.ts`

---

## Phase 2: User Story 1 — Core Export Functionality (Priority: P1) 🎯 MVP

**Goal**: Authenticated users with `export-locations:competition` can call
`GET /export/locations?eventId={id}` and receive a correctly structured XLSX or CSV
file with one row per calendar weekday per location, deduplicated.

**Independent Test**: `GET /export/locations?eventId={valid-id}&format=xlsx` with a
valid auth token → HTTP 200, `Content-Type` XLSX, sheet `Locations`, 6 columns in order,
one row per unique `(clubId, locationName, dayName)`, Dutch day names, assembled address.
Same with `format=csv` → HTTP 200, `Content-Type: text/csv`.

- [X] T002 [US1] Create `LocationsService` in `apps/api/src/app/services/export/locations.service.ts` with:
  - `assembleAddress(location)` helper: join `[street, streetNumber, postalcode, city].filter(Boolean)` with `" "`, fall back to `location.address ?? ""`
  - `getLocations(eventId)` method: `EventEntry.findAll` with nested `SubEventCompetition where: { eventId }` (required join, `attributes: []`) + `Team → Club → Location → Availability` include; flatMap entries → locations → availabilities → days; filter to `day.courts` truthy only; build composite key `${club.clubId}|${location.name}|${dayName}` for dedup Set; `Aantal Velden` = `day.courts`; return `{ headers, rows, eventName }`
  - `DAY_NAMES` constant (same as `TeamsService`): `{ monday: "Maandag", tuesday: "Dinsdag", ... }`
  - HEADERS constant: `["Club ID", "Clubnaam", "Locatie", "Adres", "Dag", "Aantal Velden"]`
  - `NotFoundException` when `EventCompetition` does not exist
- [X] T003 [US1] Add `getLocations()` handler to `ExportController` in `apps/api/src/app/controllers/export.controller.ts` following the exact same structure as `getTeams()` and `getExceptions()`: `format` param (default `xlsx`), call `locationsService.getLocations(eventId)`, apply `toXlsx("Locations", headers, rows)` or `toCSV(headers, rows)`, set `Content-Disposition: attachment; filename="{eventName}-locations.xlsx"` (or `.csv`)
- [X] T004 [P] [US1] Write `locations.service.spec.ts` in `apps/api/src/app/services/export/locations.service.spec.ts` covering:
  - Returns 6 headers in correct order
  - Returns `eventName` from the competition
  - Single day entry with `courts > 0` → exactly 1 row
  - Day entry with `courts = 0` → excluded (0 rows)
  - Day entry with `courts` absent/undefined → excluded (0 rows)
  - Multiple day entries across locations → correct row count
  - Deduplication: same `(clubId, locationName, dayName)` from two different entries → 1 row
  - Dutch day name in `Dag` column: `"monday"` → `"Maandag"`
  - All 7 weekday translations correct
  - Address assembled from `street + streetNumber + postalcode + city`
  - Address falls back to `location.address` when structured fields are absent
  - Address is `""` when all address fields absent
  - Club with no locations → skipped gracefully, no error
  - Entry with no team → skipped gracefully, no error
  - `NotFoundException` when `EventCompetition` does not exist

**Checkpoint**: `npx jest --testPathPattern=locations.service.spec` — all tests pass.

---

## Phase 3: User Story 2 — Endpoint Security (Priority: P1)

**Goal**: Unauthenticated callers get 401; authenticated callers without
`export-locations:competition` get 403. No data is read until both checks pass.

**Independent Test**: Request without token → 401. Request with token lacking the
permission → 403. Request with correct token → proceeds to data lookup (no auth error).

- [X] T005 [US2] Add auth guards to the `getLocations()` handler in `apps/api/src/app/controllers/export.controller.ts`:
  - `if (!user?.id) throw new UnauthorizedException('Login required')`
  - `if (!(await user.hasAnyPermission(['export-locations:competition']))) throw new ForbiddenException('Insufficient permissions')`
  - Both checks MUST appear before any `query` access or service call

**Checkpoint**: Manual smoke-test with no token → 401; wrong permission → 403.

---

## Phase 4: User Story 3 — Input Validation (Priority: P1)

**Goal**: Missing, malformed, or non-existent `eventId` and unknown `format` values
are rejected with structured HTTP errors before any database work begins.

**Independent Test**: No `eventId` → 400. Non-UUID `eventId` → 400. Valid UUID with no
matching competition → 404. Unknown `format` → 400.

- [X] T006 [US3] Add input validation to the `getLocations()` handler in `apps/api/src/app/controllers/export.controller.ts` following the exact same guard order as `getTeams()` and `getExceptions()`:
  - `if (!VALID_FORMATS.includes(format)) throw new BadRequestException(...)`
  - `if (!query.eventId || !IsUUID(query.eventId)) throw new BadRequestException(...)`
  - `NotFoundException` from `LocationsService.getLocations` propagates as HTTP 404 automatically via NestJS

**Checkpoint**: `GET /export/locations` without `eventId` → 400; with `eventId=not-a-uuid` → 400; with unknown `format=pdf` → 400.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T007 [P] Run `npx jest --config apps/api/jest.config.ts` and confirm all tests (teams + exceptions + locations) pass
- [X] T008 [P] Run `prettier --check apps/api/src/app/controllers/export.controller.ts apps/api/src/app/services/export/locations.service.ts apps/api/src/app/services/export/locations.service.spec.ts` and fix any formatting issues

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
- `LocationsService` must NOT import `xlsx` directly — use `toXlsx`/`toCSV` from `@badman/backend-utils`
- `days` is `json NOT NULL` in DB — always an array at runtime; `?? []` used for TypeScript type safety only
- Only days with `day.courts` truthy produce rows — days with `courts = 0` or `courts` absent are excluded
- Dedup key uses the Dutch day name (`Maandag`) not the raw key (`monday`)
- No new Nx lib, no new controller — additions only to existing files plus two new service files
