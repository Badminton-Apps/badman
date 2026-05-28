# Feature Specification: Exceptions Export — Backend Endpoint

**Feature Branch**: `010-exceptions-export`
**Created**: 2026-05-07
**Status**: Draft
**Input**: Create a server-side `GET /export/exceptions` REST endpoint that returns a
deduplicated XLSX or CSV file of all location exceptions (unavailable dates) for clubs
enrolled in a competition, replacing the client-side XLSX generation done in the old
Angular frontend.

> **Migration context**: The old Angular app built the exceptions spreadsheet
> entirely in the browser — it queried team/club/location/availability data via
> GraphQL and used the `xlsx` library to assemble the file on the client. This spec
> moves that work to the backend so the new frontend only makes one authenticated
> HTTP call and receives a ready-made file.

> **Architecture decision**: `ExportController` lives directly in the API app
> (`apps/api/`) following the same pattern as `CpController` and spec 009
> (`GET /export/teams`). The controller was already created in spec 009 — this spec
> adds a new handler to the existing controller. No new Nx lib is created.

> **Shared utilities**: `toXlsx` and `toCSV` from `@badman/backend-utils` (spec 008)
> are the only permitted output generators. Services assemble `{ headers, rows }` only;
> the controller applies the format.

> **Frontend handoff**: The backend endpoint defined here is the integration
> target for the new frontend. See the Frontend Handoff section at the bottom of
> this spec for everything the frontend team needs.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Download Exceptions Export in chosen format (Priority: P1)

A competition administrator wants a file of all location exceptions — dates when clubs'
venues are unavailable — for all clubs enrolled in a competition. One row per calendar
day per location exception. They call
`GET /export/exceptions?eventId={id}&format=xlsx` (or `csv`) with a valid auth token
and receive the file immediately in the requested format.

**Why this priority**: Core deliverable. Without this endpoint the feature does not
exist. Exception data is needed by competition schedulers to avoid assigning matches on
days when venues are unavailable.

**Independent Test**: Authenticated request with a valid `eventId` and `format=xlsx`
→ HTTP 200 with `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`,
file contains sheet `Exceptions`, 5 columns in order, one row per unique
`(clubId, locationName, date)` combination (no duplicates across sub-events or draws).
Same request with `format=csv` → HTTP 200 with `Content-Type: text/csv`, correct header
row, one data row per unique combination.

**Acceptance Scenarios**:

1. **Given** an authenticated user with `export-exceptions:competition` and a valid
   `eventId`, **When** `GET /export/exceptions?format=xlsx` is called, **Then** HTTP 200
   is returned with an XLSX attachment.
2. **Given** the same request with `format=csv`, **Then** HTTP 200 is returned with a
   CSV attachment.
3. **Given** the same request with no `format` param, **Then** HTTP 200 is returned
   with an XLSX attachment (default format).
4. **Given** a competition where a club location has an exception spanning multiple
   days, **When** the export is generated, **Then** one row per day in the range
   appears in the output.
5. **Given** an exception with only a `start` date and no `end` date, **When** the
   export is generated, **Then** exactly one row for `start` appears.
6. **Given** the same `(clubId, locationName, date)` combination appearing in multiple
   draws or sub-events, **When** the export is generated, **Then** that combination
   appears exactly once in the output.
7. **Given** a competition with no exceptions across any enrolled club, **When** the
   export is generated, **Then** a valid file is returned with only the header row.

---

### User Story 2 — Endpoint Security (Priority: P1)

`GET /export/exceptions` must be protected: unauthenticated callers get 401,
authenticated callers without the right permission get 403. No data is touched until
both checks pass.

**Why this priority**: Consistent security posture across all export endpoints.
Exception data reveals club venue availability schedules — information that should not
be publicly accessible.

**Independent Test**: Request without token → 401. Request with token lacking
`export-exceptions:competition` → 403. Request with correct token → proceeds to data
lookup.

**Acceptance Scenarios**:

1. **Given** an unauthenticated request, **When** processed, **Then** HTTP 401 is
   returned and no data is read.
2. **Given** an authenticated request from a user without `export-exceptions:competition`,
   **When** processed, **Then** HTTP 403 is returned.

---

### User Story 3 — Input Validation (Priority: P1)

`eventId` must be a valid UUID that maps to an existing competition before any
database traversal begins. An invalid `format` value must be rejected before any
data is read.

**Why this priority**: Prevents 500 errors from bad input and ensures consistent
error contracts across all export endpoints (same pattern as specs 008 and 009).

**Independent Test**: Missing `eventId` → 400. Non-UUID `eventId` → 400. Valid UUID
with no matching competition → 404. Unknown `format` value → 400.

**Acceptance Scenarios**:

1. **Given** a request with no `eventId`, **When** processed, **Then** HTTP 400 is
   returned.
2. **Given** a request where `eventId` is not a valid UUID, **When** processed,
   **Then** HTTP 400 is returned.
3. **Given** a request where `eventId` is a valid UUID matching no competition,
   **When** processed, **Then** HTTP 404 is returned.
4. **Given** a request where `format` is not `xlsx` or `csv`, **When** processed,
   **Then** HTTP 400 is returned.

---

### Edge Cases

- An exception spanning multiple days produces one row per day in the range, inclusive
  of both `start` and `end` dates.
- An exception with only `start` and no `end` produces exactly one row for `start`.
- The same `(clubId, locationName, date)` appearing via multiple draws or sub-events
  produces only one row (deduplicated by composite key).
- A club with no locations, or a location with no availabilities, or an availability
  with an empty exceptions array must be skipped gracefully — not produce a 500.
- Dates are formatted in Belgian locale (`DD/MM/YYYY`, timezone `Europe/Brussels`)
  regardless of the server's local timezone.
- A competition with no enrolled teams or no sub-events returns a valid file with the
  header row only — not a 500.
- An unknown `format` value returns 400, not a 500.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `GET /export/exceptions` MUST return HTTP 401 for unauthenticated requests.
- **FR-002**: `GET /export/exceptions` MUST return HTTP 403 for authenticated requests
  lacking the `export-exceptions:competition` permission.
- **FR-003**: `GET /export/exceptions` MUST return HTTP 400 when `eventId` is absent
  or not a valid UUID.
- **FR-004**: `GET /export/exceptions` MUST return HTTP 404 when `eventId` is a valid
  UUID matching no competition.
- **FR-005**: `GET /export/exceptions` MUST return HTTP 400 when `format` is present
  but not one of `xlsx` or `csv`.
- **FR-006**: When `format=xlsx` (or `format` is absent), the response MUST be an XLSX
  file with sheet name `Exceptions` and exactly 5 columns in this order:
  `Club ID`, `Clubnaam`, `Locatie`, `Datum`, `Velden`.
- **FR-007**: When `format=csv`, the response MUST be a UTF-8 CSV file with the same
  5 columns in the same order, RFC 4180 compliant, with CRLF line endings.
- **FR-008**: For each exception record with a `start` and `end` date, the export
  MUST expand the date range and produce one row per calendar day from `start` to
  `end` (inclusive).
- **FR-009**: For each exception record with only a `start` date (no `end`), the
  export MUST produce exactly one row for that date.
- **FR-010**: All dates in the output MUST be formatted as `DD/MM/YYYY` in the
  `Europe/Brussels` timezone, regardless of server locale.
- **FR-011**: The output MUST be deduplicated by the composite key
  `(clubId, locationName, date)` — the same combination appearing across multiple
  draws or sub-events produces at most one row.
- **FR-012**: The endpoint MUST use `toXlsx` or `toCSV` from `@badman/backend-utils`
  for file generation. No inline XLSX or CSV assembly in the service or controller.
- **FR-013**: The response MUST include a `Content-Disposition: attachment` header
  with a filename derived from the competition name, the suffix `-exceptions`, and
  the chosen format extension (e.g., `{event.name}-exceptions.xlsx`).
- **FR-014**: `format` MUST default to `xlsx` when the param is absent.

### Key Entities

- **EventCompetition**: Root entity identified by `eventId`. Traversed to reach
  sub-events → draws → entries → teams → clubs → locations → availabilities.
- **SubEventCompetition**: Groups draws within the competition.
- **DrawCompetition**: Groups event entries.
- **EventEntry**: Links a team to a draw; the starting point for reaching club data.
- **Team**: Carries a reference to its `Club`.
- **Club**: Carries `clubId` (federation ID shown in the export) and `name`.
- **Location**: A venue associated with a club. Carries `name`.
- **Availability**: Links a location to its scheduling data. Carries `exceptions`.
- **Exception**: A date range `{ start: Date, end?: Date }` indicating when a location
  is unavailable. Each exception expands into one row per day in the range.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Unauthenticated and unauthorised requests to `GET /export/exceptions`
  are rejected — verified by automated tests covering 401, 403, 400, and 404.
- **SC-002**: Date range expansion is correct — a multi-day exception produces the
  exact number of rows equal to the day count of the range, verified by automated tests
  with mocked data containing single-day, multi-day, and end-date-absent exceptions.
- **SC-003**: Deduplication works — the same `(clubId, locationName, date)` combination
  appearing via two different draws produces exactly one row in the output, verified by
  automated tests.
- **SC-004**: Date formatting is timezone-correct — dates are always rendered in
  `DD/MM/YYYY` format under `Europe/Brussels`, verified by a test case using a date
  near midnight UTC that would shift day under a different timezone.
- **SC-005**: The endpoint reuses `toXlsx` and `toCSV` from the shared utility — no
  direct `xlsx` library dependency in the exceptions service or controller.

---

## Assumptions

- `export-exceptions:competition` is the correct permission gate. This permission
  already exists in the database and is assigned to individual users (not roles); no
  seeding is needed.
- Exception deduplication uses the composite key `(clubId, locationName, date)`
  (formatted string), consistent with the old Angular implementation.
- `Availability.exceptions` is an array of objects with at least a `start` field
  (JavaScript `Date` or ISO string). `end` is optional; if absent, the exception is
  treated as a single-day event.
- Date expansion iterates day-by-day from `start` to `end` (inclusive), adding 24
  hours per step. Timezone handling uses `Europe/Brussels` throughout.
- The `Velden` (courts/fields) column maps to the number of courts associated with the
  exception or location. If unavailable or null, an empty string is used.
- The endpoint is added to the existing `ExportController` in
  `apps/api/src/app/controllers/export.controller.ts` (created in spec 009) — no new
  controller or Nx lib is created.
- The existing enrollment endpoint (`GET /excel/enrollment`) and teams endpoint
  (`GET /export/teams`) are out of scope and are not modified.
- `format` defaults to `xlsx` when the param is absent.
- The old Angular `getExceptionsExport` method (GraphQL + browser XLSX) is fully
  replaced by this endpoint — no client-side file generation is needed.

---

## Clarifications

### Session 2026-05-07

- Q: What does the `Velden` column contain? → A: Number of courts associated with the
  exception or location availability entry. If absent or null, output an empty string.
- Q: Should the endpoint be on the existing `ExportController` from spec 009? → A: Yes.
  The controller already exists; this spec adds a new handler method to it.
- Q: Is `end` always present on exception objects? → A: No. `end` is optional.
  A missing `end` means a single-day exception — produce one row for `start` only.
- Q: Is `export-exceptions:competition` an already-existing permission in the database?
  → A: Yes, confirmed. It is seeded by migration `20250704200000-AddExportPermissions.js`
  alongside `export-teams:competition`. No new migration or seeding is needed for this spec.

---

## Frontend Handoff

Everything the frontend team needs to integrate this endpoint:

| Item | Value |
|------|-------|
| Method | `GET` |
| Path | `/api/export/exceptions` |
| Query param | `eventId` (UUID, required) |
| Query param | `format` (`xlsx` \| `csv`, optional, default `xlsx`) |
| Auth | Bearer token required |
| Permission | `export-exceptions:competition` |
| Response (xlsx) | HTTP 200 — `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` binary |
| Response (csv) | HTTP 200 — `text/csv; charset=utf-8` text |
| Response (no auth) | HTTP 401 |
| Response (no permission) | HTTP 403 |
| Response (bad eventId or format) | HTTP 400 |
| Response (not found) | HTTP 404 |
| Filename header | `Content-Disposition: attachment; filename="{competitionName}-exceptions.xlsx"` or `.csv` |

### Naming clarification

`EventCompetition` (database model / GraphQL type) and "competition" (frontend
component prop) are the same entity. The mapping is:

```
competition.id  →  EventCompetition.id (UUID primary key)  →  ?eventId={uuid}
```

No intermediate lookup is needed.

**Frontend integration pattern**:
```
GET /api/export/exceptions?eventId={competition.id}&format=xlsx
Authorization: Bearer {token}
→ trigger browser file download of the binary response

GET /api/export/exceptions?eventId={competition.id}&format=csv
Authorization: Bearer {token}
→ trigger browser file download of the text response
```

The old Angular pattern fetched data via GraphQL and assembled the XLSX in the browser.
The new pattern replaces that entirely: one HTTP call to this endpoint, save the response
as a file. No `xlsx` library needed in the frontend.
