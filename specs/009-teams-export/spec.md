# Feature Specification: Teams Export — Backend Endpoint

**Feature Branch**: `009-teams-export`
**Created**: 2026-05-06
**Status**: Draft
**Input**: Create a server-side `GET /export/teams` REST endpoint that returns a
deduplicated XLSX or CSV file of all enrolled teams for a competition, replacing the
client-side XLSX generation done in the old Angular frontend.

> **Migration context**: The old Angular app builds the teams spreadsheet
> entirely in the browser — it queries team data via GraphQL and uses the `xlsx`
> library to assemble the file on the client. This spec moves that work to the
> backend so the new frontend only makes one authenticated HTTP call and receives
> a ready-made file.

> **Architecture decision**: `ExportController` lives directly in the API app
> (`apps/api/`) following the same pattern as `CpController`, registered in
> `AppModule.controllers`. No new Nx lib is created. The existing enrollment
> endpoint is not touched — only the teams export is in scope for this spec.

> **Shared utilities**: `toXlsx` and `toCSV` from `@badman/backend-utils` (spec 008)
> are the only permitted output generators. Services assemble `{ headers, rows }` only;
> the controller applies the format.

> **Frontend handoff**: The backend endpoint defined here is the integration
> target for the new frontend. See the Frontend Handoff section at the bottom of
> this spec for everything the frontend team needs.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Download Teams Export in chosen format (Priority: P1)

A competition administrator wants a file of all teams enrolled in a competition —
one row per unique team — showing club identity, team name, and the team's preferred
play day and time. They call `GET /export/teams?eventId={id}&format=xlsx` (or `csv`)
with a valid auth token and receive the file immediately in the requested format.

**Why this priority**: Core deliverable. Without this, the endpoint does not
exist and nothing else can be tested.

**Independent Test**: Authenticated request with a valid `eventId` and `format=xlsx`
→ HTTP 200 with `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`,
file contains sheet `Teams`, 5 columns in order, one row per unique team
(no duplicates across sub-events or draws). Same request with `format=csv` →
HTTP 200 with `Content-Type: text/csv`, correct header row, one data row per unique team.

**Acceptance Scenarios**:

1. **Given** an authenticated user with `edit:competition` and a valid `eventId`,
   **When** `GET /export/teams?format=xlsx` is called, **Then** HTTP 200 is returned
   with an XLSX attachment.
2. **Given** the same request with `format=csv`, **Then** HTTP 200 is returned
   with a CSV attachment.
3. **Given** the same request with no `format` param, **Then** HTTP 200 is returned
   with an XLSX attachment (default format).
4. **Given** a competition with teams enrolled across multiple sub-events and
   draws, **When** the export is generated, **Then** each team appears exactly
   once regardless of format (deduplicated by team identity).
5. **Given** a competition with no enrolled teams, **When** the export is
   generated, **Then** a valid file is returned with only the header row.

---

### User Story 2 — Endpoint Security (Priority: P1)

`GET /export/teams` must be protected: unauthenticated callers get 401, authenticated
callers without the right permission get 403. No data is touched until both checks pass.

**Why this priority**: Consistent security posture across all export endpoints.
The teams spreadsheet contains club IDs, team names, and scheduling preferences
— information that should not be publicly accessible.

**Independent Test**: Request without token → 401. Request with token lacking
`edit:competition` → 403. Request with correct token → proceeds to data lookup.

**Acceptance Scenarios**:

1. **Given** an unauthenticated request, **When** processed, **Then** HTTP 401
   is returned and no data is read.
2. **Given** an authenticated request from a user without `edit:competition`,
   **When** processed, **Then** HTTP 403 is returned.

---

### User Story 3 — Input Validation (Priority: P1)

`eventId` must be a valid UUID that maps to an existing competition before any
database traversal begins. An invalid `format` value must be rejected before any
data is read.

**Why this priority**: Prevents 500 errors from bad input and ensures consistent
error contracts across all export endpoints.

**Independent Test**: Missing `eventId` → 400. Non-UUID `eventId` → 400. Valid
UUID with no matching competition → 404. Unknown `format` value → 400.

**Acceptance Scenarios**:

1. **Given** a request with no `eventId`, **When** processed, **Then** HTTP 400
   is returned.
2. **Given** a request where `eventId` is not a valid UUID, **When** processed,
   **Then** HTTP 400 is returned.
3. **Given** a request where `eventId` is a valid UUID matching no competition,
   **When** processed, **Then** HTTP 404 is returned.
4. **Given** a request where `format` is not `xlsx` or `csv`, **When** processed,
   **Then** HTTP 400 is returned.

---

### Edge Cases

- A team enrolled in multiple draws or sub-events must appear only once in the
  output (deduplicated by team ID — same logic as the old Angular client).
- A team with no preferred day or time must produce empty strings in those
  columns, not errors, in both XLSX and CSV output.
- A competition with no sub-events or no draws returns a valid file with the
  header row only — not a 500.
- An unknown `format` value returns 400, not a 500.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `GET /export/teams` MUST return HTTP 401 for unauthenticated requests.
- **FR-002**: `GET /export/teams` MUST return HTTP 403 for authenticated requests
  lacking the `edit:competition` permission.
- **FR-003**: `GET /export/teams` MUST return HTTP 400 when `eventId` is absent
  or not a valid UUID.
- **FR-004**: `GET /export/teams` MUST return HTTP 404 when `eventId` is a valid
  UUID matching no competition.
- **FR-005**: `GET /export/teams` MUST return HTTP 400 when `format` is present
  but not one of `xlsx` or `csv`.
- **FR-006**: When `format=xlsx` (or `format` is absent), the response MUST be an
  XLSX file with sheet name `Teams` and exactly 5 columns in this order:
  `Club ID`, `Clubnaam`, `Ploegnaam`, `Voorkeur speelmoment (dag)`,
  `Voorkeur speelmoment (tijdstip)`.
- **FR-006a**: `Voorkeur speelmoment (dag)` MUST be the Dutch day name
  (`monday` → `Maandag`, `tuesday` → `Dinsdag`, etc.). An absent value produces
  an empty string.
- **FR-006b**: `Voorkeur speelmoment (tijdstip)` MUST be formatted as `HH:mm`
  (seconds stripped). An absent value produces an empty string.
- **FR-007**: When `format=csv`, the response MUST be a UTF-8 CSV file with the
  same 5 columns in the same order, RFC 4180 compliant, with CRLF line endings.
  The same day-name translation and time formatting (FR-006a, FR-006b) apply.
- **FR-008**: Each team MUST appear at most once in the output regardless of how
  many sub-events or draws it is enrolled in (deduplicated by team identity).
- **FR-009**: The endpoint MUST use `toXlsx` or `toCSV` from `@badman/backend-utils`
  for file generation. No inline XLSX or CSV assembly in the service or controller.
- **FR-010**: The response MUST include a `Content-Disposition: attachment` header
  with a filename derived from the competition name and the chosen format extension.

### Key Entities

- **EventCompetition**: Root entity; identified by `eventId`. Traversed to reach
  sub-events → draws → entries → teams.
- **SubEventCompetition**: Groups draws within the competition. Multiple
  sub-events may reference the same team.
- **DrawCompetition**: Groups event entries. Multiple draws may reference the
  same team.
- **EventEntry**: Links a team to a draw. The source of team references.
- **Team**: The unit of deduplication. Carries `name`, `preferredDay`,
  `preferredTime`, and a reference to its `Club`.
- **Club**: Carries `clubId` (the federation ID shown in the export) and `name`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Unauthenticated and unauthorised requests to `GET /export/teams`
  are rejected — verified by automated tests covering 401, 403, 400, and 404.
- **SC-002**: Both XLSX and CSV outputs contain exactly 5 columns in the correct
  order and one row per unique team, verified by regression tests against a mocked
  competition with teams enrolled across multiple draws.
- **SC-003**: The endpoint reuses `toXlsx` and `toCSV` from the shared utility —
  no direct `xlsx` library dependency in the teams service or controller.
- **SC-004**: An invalid `format` value returns 400 without touching the database.

---

## Assumptions

- `edit:competition` is the correct permission gate, consistent with all other
  competition management operations.
- Team deduplication uses team ID as the unique key, consistent with the old
  Angular implementation.
- `preferredDay` is stored as an ENUM string (`"monday"`, `"tuesday"`, …) and
  MUST be translated to Dutch on the backend before output
  (`monday` → `Maandag`, `tuesday` → `Dinsdag`, `wednesday` → `Woensdag`,
  `thursday` → `Donderdag`, `friday` → `Vrijdag`, `saturday` → `Zaterdag`,
  `sunday` → `Zondag`). The old Angular teams export emitted this raw (a known
  inconsistency vs. the locations export which did translate); this spec fixes it.
- `preferredTime` is stored as `DataType.TIME` and Sequelize returns it as a
  string (e.g. `"09:00:00"`). It MUST be formatted as `HH:mm` (seconds stripped)
  before output.
- `format` defaults to `xlsx` when the param is absent.
- The endpoint lives in the API app (`apps/api/`) following the same pattern as
  `CpController` — `ExportController` is registered directly in
  `AppModule.controllers`. No new Nx lib is created.
- The existing enrollment endpoint (`GET /excel/enrollment`) is out of scope and
  is not modified. Its migration is a separate future spec.
- The old Angular `getTeamsExport` method (GraphQL + browser XLSX) is fully
  replaced by this endpoint — no client-side file generation is needed.

---

## Clarifications

### Session 2026-05-06

- Q: Does the frontend need to fetch a separate event object to get `eventId`, or is it already in scope? → A: No separate fetch needed. `EventCompetition` and the "competition" in the frontend are the same entity. The `competition.id` prop already available in `CompetitionOverviewTableActions` is the UUID primary key of `EventCompetition` — pass it directly as `?eventId={competition.id}`.
- Q: Should the endpoint support both XLSX and CSV formats? → A: Yes. A `format` query param (`xlsx` | `csv`, default `xlsx`) controls the output. The controller applies the format; the service only assembles rows.
- Q: Should `preferredDay` and `preferredTime` be formatted server-side? → A: Yes. `preferredDay` is translated to Dutch day names (`monday` → `Maandag`, etc.); `preferredTime` is formatted as `HH:mm`. The old Angular teams export emitted raw values — this is a deliberate fix to match the consistency of the locations export.
- Q: Where does the endpoint live? → A: Directly in the API app (`apps/api/src/app/controllers/export.controller.ts`), registered in `AppModule.controllers` — same pattern as `CpController`. No new Nx lib. Enrollment endpoint is out of scope and untouched.

---

## Frontend Handoff

Everything the frontend team needs to integrate this endpoint:

| Item | Value |
|------|-------|
| Method | `GET` |
| Path | `/api/export/teams` |
| Query param | `eventId` (UUID, required) |
| Query param | `format` (`xlsx` \| `csv`, optional, default `xlsx`) |
| Auth | Bearer token required |
| Permission | `edit:competition` |
| Response (xlsx) | HTTP 200 — `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` binary |
| Response (csv) | HTTP 200 — `text/csv; charset=utf-8` text |
| Response (no auth) | HTTP 401 |
| Response (no permission) | HTTP 403 |
| Response (bad eventId or format) | HTTP 400 |
| Response (not found) | HTTP 404 |
| Filename header | `Content-Disposition: attachment; filename="{competitionName}.xlsx"` or `.csv` |

### Naming clarification

`EventCompetition` (database model / GraphQL type) and "competition" (frontend
component prop) are the same entity. The mapping is:

```
competition.id  →  EventCompetition.id (UUID primary key)  →  ?eventId={uuid}
```

No intermediate lookup is needed. The `competition` object already in scope
inside `CompetitionOverviewTableActions` provides everything required.

**Frontend integration pattern**:
```
GET /api/export/teams?eventId={competition.id}&format=xlsx
Authorization: Bearer {token}
→ trigger browser file download of the binary response

GET /api/export/teams?eventId={competition.id}&format=csv
Authorization: Bearer {token}
→ trigger browser file download of the text response
```

The old Angular pattern (`getTeamsExport` in `ExcelService`) fetched data via
GraphQL and assembled the XLSX in the browser. The new pattern replaces that
entirely: one HTTP call to this endpoint, save the response as a file.
No `xlsx` library needed in the frontend.
