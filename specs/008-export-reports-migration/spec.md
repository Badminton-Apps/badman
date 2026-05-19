# Feature Specification: Export Foundation — Security Hardening & Shared XLSX Utility

**Feature Branch**: `008-export-reports-migration`
**Created**: 2026-05-05
**Status**: Draft
**Input**: Foundational step for the export/report migration. Protect the existing
unguarded enrollment export endpoint, establish input validation, and extract a
shared XLSX utility that all future export services will reuse.

> **Scope note — CP export**: The CP file export (`generate-cp.yml` GitHub
> Actions workflow + `CpDataCollector`) is partially built but requires a
> backend trigger endpoint, webhook callback, and email notification before the
> frontend can use it. That work is out of scope here and will be addressed in a
> dedicated spec.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Protect the Enrollment Export Endpoint (Priority: P1)

The `GET /excel/enrollment` endpoint currently has no login requirement. Anyone
who knows the URL can download a spreadsheet containing player names, member IDs,
gender, team names, ranking levels, and sub-event placements for an entire
competition. After this work, the endpoint requires the caller to be
authenticated and to hold the `edit:competition` permission.

**Why this priority**: Active security vulnerability. Must be closed before any
new frontend exposes the endpoint to a wider audience.

**Independent Test**: Send an unauthenticated request to
`GET /excel/enrollment?eventId={valid-id}` — must return HTTP 401. Send an
authenticated request from a user without `edit:competition` — must return
HTTP 403. Send an authenticated request from a user with `edit:competition` and
a valid `eventId` — must return HTTP 200 with the XLSX file, its content
unchanged.

**Acceptance Scenarios**:

1. **Given** an unauthenticated request to `GET /excel/enrollment`, **When**
   processed, **Then** HTTP 401 is returned and no file data is sent.
2. **Given** an authenticated request from a user without `edit:competition`,
   **When** processed, **Then** HTTP 403 is returned.
3. **Given** an authenticated request from a user with `edit:competition` and a
   valid `eventId`, **When** processed, **Then** HTTP 200 is returned with an
   XLSX file whose content is identical to the pre-hardening output.

---

### User Story 2 — Input Validation on the Enrollment Endpoint (Priority: P1)

The endpoint does not validate `eventId` before executing the database query.
A missing, malformed, or non-existent value either causes an unhandled server
error or silently returns an empty file. After this work, invalid input is
rejected with clear HTTP status codes before any database work is attempted.
This also establishes the validation pattern for all three new export endpoints
(specs 009–011).

**Why this priority**: Correctness and consistency with the new endpoints that
will follow. Bundled with the security hardening pass for efficiency.

**Independent Test**: Send three authenticated requests (with `edit:competition`)
using (a) no `eventId`, (b) a non-UUID string, and (c) a valid UUID that does
not match any competition. All three must return structured error responses —
not 500 or empty bodies.

**Acceptance Scenarios**:

1. **Given** a request with no `eventId` parameter, **When** processed, **Then**
   HTTP 400 is returned.
2. **Given** a request where `eventId` is not a valid UUID, **When** processed,
   **Then** HTTP 400 is returned.
3. **Given** a request where `eventId` is a valid UUID that does not exist,
   **When** processed, **Then** HTTP 404 is returned.

---

### User Story 3 — Shared XLSX Utility (Priority: P2)

The enrollment export service contains XLSX generation logic (workbook creation,
auto-sized columns, header autofilter, buffer output) that the three upcoming
export services for teams, exceptions, and locations will each need. Extracting
this logic into a shared module now means it is tested once, reused consistently,
and the enrollment service output is verified against the refactored utility
before any new services depend on it.

**Why this priority**: Direct prerequisite for specs 009 (teams), 010
(exceptions), and 011 (locations). Doing the refactor alongside the security
hardening catches regressions immediately against a known-good output.

**Independent Test**: Trigger the enrollment export before and after the refactor
for the same competition. Both files must have:
- Sheet name: `Enrollment`
- 12 columns (exact order): `Naam`, `Voornaam`, `Lidnummer`, `Geslacht`, `Ploeg`,
  `Enkel`, `Dubbel`, `Gemengd`, `Afdeling`, `Reeks`,
  `Somindex gemengde competitie`, `Somindex heren-/damescompetitie`
- Same row count and identical cell values for the same competition

**Acceptance Scenarios**:

1. **Given** the enrollment service has been refactored to use the shared
   utility, **When** an authorised user requests the enrollment export,
   **Then** the file contains the same 12 columns, row count, and cell values
   as before the refactor.
2. **Given** the shared utility is called with a headers array and a data-rows
   array, **When** it produces a workbook, **Then** the resulting sheet has an
   autofilter on the header row and column widths sized to fit the content.

---

### Edge Cases

- What if the user's auth token is expired? HTTP 401 from the existing auth
  layer — no special handling needed.
- What if `eventId` is a valid UUID but the competition is soft-deleted?
  Treat as 404 — no special case needed here.
- What if the XLSX refactor produces slightly different column widths?
  Acceptable — the requirement is data fidelity (columns, row count, cell
  values), not pixel-identical layout.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `GET /excel/enrollment` MUST return HTTP 401 for unauthenticated
  requests.
- **FR-002**: `GET /excel/enrollment` MUST return HTTP 403 for authenticated
  requests lacking the `edit:competition` permission.
- **FR-003**: `GET /excel/enrollment` MUST return HTTP 400 when `eventId` is
  absent or is not a valid UUID.
- **FR-004**: `GET /excel/enrollment` MUST return HTTP 404 when `eventId` is a
  valid UUID matching no competition.
- **FR-005**: The XLSX file returned by `GET /excel/enrollment` MUST be unchanged
  in sheet name, column order, row count, and cell values after adding
  authentication, authorization, and validation.
- **FR-006**: A shared XLSX utility MUST be extracted providing at minimum:
  workbook creation, adding a named sheet from a headers array and a rows array
  with auto-sized columns and a header-row autofilter, and workbook-to-buffer
  conversion.
- **FR-007**: The enrollment `ExcelService` MUST be refactored to use the shared
  XLSX utility. Its output (sheet `Enrollment`, 12 columns as specified in User
  Story 3) MUST be equivalent to its current output.

### Key Entities

- **EventCompetition**: Entry point for the export; identified by UUID `eventId`.
  Existence is checked before any data traversal begins.
- **Permission**: String assigned per user (not per role). `edit:competition`
  gates `GET /excel/enrollment`. Already exists in the database; no seeding
  needed.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero unauthenticated downloads are possible from
  `GET /excel/enrollment` after deployment — verified by automated tests
  covering the 401, 403, 400, and 404 responses.
- **SC-002**: The enrollment XLSX produced after the shared-utility refactor
  contains the same 12 columns, same row count, and identical cell values as
  the pre-refactor file for the same competition.
- **SC-003**: The shared XLSX utility has its own unit tests covering workbook
  creation, sheet building (correct headers, autofilter, column sizing), and
  buffer output.

---

## Assumptions

- The `edit:competition` permission string already exists in the database and is
  assigned to the appropriate users — no seeding is needed.
- The auth pattern (`@User()` decorator + `canExecute()` utility) is already
  established in the codebase and is applied here to a REST controller following
  the same approach used in GraphQL resolvers.
- No changes are made to the data content or file format of the enrollment
  export — this is security hardening and a refactor only.
- The shared XLSX utility will live in a new backend library within the existing
  Nx monorepo.
- The CP file endpoint and its async GitHub Actions flow are explicitly out of
  scope and will be addressed in a dedicated future spec.
