# Feature Specification: Locations Export

**Feature Branch**: `011-locations-export`
**Created**: 2026-05-07
**Status**: Draft
**Input**: User description: "i want to work on locations now"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Core Export Functionality (Priority: P1)

A competition organiser wants to download a structured file listing every club's
playing locations — with address, weekly playing day, and number of available
courts — for all clubs enrolled in a competition. They use this file to plan
the competition calendar and verify venue capacity.

**Why this priority**: This is the primary deliverable. The endpoint has no value
without the data it is meant to export.

**Independent Test**: `GET /export/locations?eventId={valid-id}&format=xlsx` with a
valid auth token → HTTP 200, `Content-Type` XLSX, sheet `Locations`, 6 columns in
correct order, one row per unique `(clubId, locationName, day)`, day name in Dutch,
address assembled from location fields. Same call with `format=csv` → HTTP 200,
`Content-Type: text/csv`.

**Acceptance Scenarios**:

1. **Given** a competition with enrolled clubs that have locations with availability days, **When** the organiser calls the endpoint, **Then** the file contains one row per unique `(club, location, weekday)` combination with the correct address and court count.
2. **Given** a club enrolled in multiple draws of the same competition, **When** the organiser calls the endpoint, **Then** that club's location-day rows appear only once (deduplicated).
3. **Given** a location with an availability record that has no `days` entries with a `courts` value, **When** the organiser calls the endpoint, **Then** that location produces no rows.
4. **Given** `format=csv`, **When** the organiser calls the endpoint, **Then** the response is a valid CSV file with the same columns and data.

---

### User Story 2 — Endpoint Security (Priority: P1)

Only authenticated users with the `export-locations:competition` permission may
access the locations export. Unauthenticated or unauthorised requests must be
rejected before any data is read.

**Why this priority**: P1 — same priority as core data, since an unsecured endpoint
is not acceptable to ship.

**Independent Test**: Request without token → 401. Request with token lacking
`export-locations:competition` → 403. Request with correct token → 200.

**Acceptance Scenarios**:

1. **Given** a request with no authentication token, **When** the endpoint is called, **Then** HTTP 401 is returned.
2. **Given** an authenticated user without `export-locations:competition` permission, **When** the endpoint is called, **Then** HTTP 403 is returned.
3. **Given** an authenticated user with `export-locations:competition` permission, **When** the endpoint is called, **Then** the request proceeds to data retrieval.

---

### User Story 3 — Input Validation (Priority: P1)

Missing, malformed, or unrecognised input parameters are rejected with clear error
messages before any database work begins.

**Why this priority**: P1 — prevents confusing errors deep in the stack reaching
the caller.

**Independent Test**: No `eventId` → 400. Non-UUID `eventId` → 400. Unknown
`format` → 400. Valid UUID that matches no competition → 404.

**Acceptance Scenarios**:

1. **Given** a request with no `eventId` parameter, **When** the endpoint is called, **Then** HTTP 400 is returned.
2. **Given** a request with a non-UUID `eventId`, **When** the endpoint is called, **Then** HTTP 400 is returned.
3. **Given** a request with `format=pdf`, **When** the endpoint is called, **Then** HTTP 400 is returned.
4. **Given** a valid UUID that matches no competition, **When** the endpoint is called, **Then** HTTP 404 is returned.

---

### Edge Cases

- What happens when a club has locations with no availability records?  → The club produces no rows; no error is thrown.
- What happens when an availability record has a `days` array that is `null` in the database? → Treated as empty; no rows produced.
- What happens when a location has no address fields populated? → The address column is left blank (empty string); the row still appears if `courts` is set.
- What happens when `courts` is absent or zero on a day entry? → That day entry is excluded (only days with a truthy `courts` value produce rows, matching legacy behaviour).
- What happens when the same `(clubId, locationName, day)` appears in multiple availability records for the same location? → Deduplicated to one row.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST expose a `GET /export/locations` endpoint that accepts `eventId` (UUID) and `format` (`xlsx` or `csv`, default `xlsx`) query parameters.
- **FR-002**: The system MUST reject requests without a valid authentication token with HTTP 401.
- **FR-003**: The system MUST reject authenticated requests lacking the `export-locations:competition` permission with HTTP 403.
- **FR-004**: The system MUST reject missing or non-UUID `eventId` values with HTTP 400.
- **FR-005**: The system MUST reject unrecognised `format` values with HTTP 400.
- **FR-006**: The system MUST return HTTP 404 when the specified competition does not exist.
- **FR-007**: The system MUST return a file with exactly 6 columns in this order: `Club ID`, `Clubnaam`, `Locatie`, `Adres`, `Dag`, `Aantal Velden`.
- **FR-008**: The system MUST produce one row per unique combination of `(clubId, locationName, day)` across all teams enrolled in the competition, deduplicated.
- **FR-009**: The system MUST only include day entries that have a court count greater than zero.
- **FR-010**: The `Dag` column MUST contain the Dutch day name (e.g., `Maandag`, `Dinsdag`).
- **FR-011**: The `Adres` column MUST be assembled from the location's `street`, `streetNumber`, `postalcode`, and `city` fields, separated by spaces, falling back to `address` if none of those fields are present.
- **FR-012**: The XLSX response MUST use the sheet name `Locations` and the `Content-Disposition` header MUST set the filename to `{eventName}-locations.xlsx` (or `.csv`).

### Key Entities

- **EventCompetition**: The competition being exported; identified by `eventId`.
- **Club**: Enrolled club; provides `clubId` (numeric federation ID) and `name`.
- **Location**: A physical venue belonging to a club; provides `name`, `street`, `streetNumber`, `postalcode`, `city`, `address`.
- **Availability**: Weekly schedule record for a location; contains a `days` JSON array.
- **AvailabilityDay**: One entry in the `days` array; fields: `day` (weekday name), `courts` (number of courts available).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An authenticated organiser with the correct permission can download the locations file for any competition in a single request.
- **SC-002**: The downloaded file contains exactly one row per unique `(club, location, weekday)` combination — no duplicates, no omissions.
- **SC-003**: The `Dag` column values are always valid Dutch weekday names; no raw English keys appear in the output.
- **SC-004**: The `Adres` column is never `undefined` or `null`; missing address data renders as an empty string.
- **SC-005**: Requests with missing or invalid parameters receive a structured HTTP error response within the same response time as other export endpoints.

## Assumptions

- The `export-locations:competition` permission is already seeded by the existing export-permissions migration (same as `export-exceptions:competition`); no new migration is needed.
- The implementation follows the exact same controller/service/test pattern as specs 009 and 010 — no new Nx lib or controller.
- Only days with a truthy `courts` value produce rows, matching the behaviour of the legacy Angular export.
- The `days` JSON column in the database can be `null`; this is handled gracefully.
- Address assembly priority: `street + streetNumber + postalcode + city` → fall back to `address` field if all four are absent.
- The `format` parameter defaults to `xlsx` when omitted.
