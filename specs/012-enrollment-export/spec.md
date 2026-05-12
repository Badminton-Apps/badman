# Feature Specification: Enrollment Export — REST Endpoint Migration

**Feature Branch**: `012-enrollment-export`
**Created**: 2026-05-08
**Status**: Draft
**Input**: Move the enrollment Excel export into the main API export controller, following the same pattern as the teams, exceptions, and locations exports.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Core Export Functionality (Priority: P1)

An authorised competition administrator calls `GET /export/enrollment?eventId={id}` and receives a correctly structured XLSX or CSV file. The file contains one row per enrolled player, showing name, member ID, gender, team, individual ranking indices, sub-event, draw, and sum-index columns. Rows are ordered by sub-event type, level, team name, and player sort order.

**Why this priority**: This is the primary reason for the feature — replacing the existing enrollment download with a consistent, maintainable REST endpoint.

**Independent Test**: `GET /export/enrollment?eventId={valid-id}&format=xlsx` with a valid auth token → HTTP 200, `Content-Type` XLSX, sheet `Enrollment`, 12 columns in correct order, one row per enrolled player. Same with `format=csv` → HTTP 200, `Content-Type: text/csv`.

**Acceptance Scenarios**:

1. **Given** a valid competition with enrolled teams and players, **When** an authorised user calls `GET /export/enrollment?eventId={id}`, **Then** the response is an XLSX file named `{eventName}-enrollment.xlsx` containing a sheet `Enrollment` with 12 columns and one data row per enrolled player.
2. **Given** the same request with `format=csv`, **Then** the response is a CSV file named `{eventName}-enrollment.csv` with the same 12 columns.
3. **Given** a competition where some entries have no team, **When** the export is generated, **Then** those entries are skipped and a server-side warning is logged — the export still succeeds with the remaining rows.
4. **Given** a competition where a player ID in the entry metadata does not resolve to a real player, **When** the export is generated, **Then** that player is skipped silently.

---

### User Story 2 — Endpoint Security (Priority: P1)

Unauthenticated callers receive 401. Authenticated callers without the required permission receive 403. No data is read until both checks pass.

**Why this priority**: Consistent with all other export endpoints; enrollment data is sensitive (player rankings, membership IDs).

**Independent Test**: Request without token → 401. Request with token lacking the permission → 403. Request with correct token → proceeds to data lookup.

**Acceptance Scenarios**:

1. **Given** a request with no auth token, **When** `GET /export/enrollment` is called, **Then** the response is HTTP 401.
2. **Given** a request with a valid token but missing `edit:competition` permission, **When** the endpoint is called, **Then** the response is HTTP 403.

---

### User Story 3 — Input Validation (Priority: P1)

Missing, malformed, or non-existent `eventId` and unknown `format` values are rejected before any database work begins.

**Why this priority**: Consistent guard order with all other export endpoints.

**Independent Test**: No `eventId` → 400. Non-UUID `eventId` → 400. Unknown `format=pdf` → 400. Valid UUID with no matching competition → 404.

**Acceptance Scenarios**:

1. **Given** no `eventId` query param, **When** the endpoint is called, **Then** HTTP 400.
2. **Given** `eventId=not-a-uuid`, **When** the endpoint is called, **Then** HTTP 400.
3. **Given** `format=pdf`, **When** the endpoint is called, **Then** HTTP 400.
4. **Given** a valid UUID that matches no competition, **When** the endpoint is called, **Then** HTTP 404.

---

### Edge Cases

- Competition with zero enrolled entries → empty body (headers only), HTTP 200.
- Entry with no team → skipped with a server-side warning log; export continues with remaining rows.
- Player ID in entry metadata not found in database → skipped, not an error.
- MX (mixed) sub-event → sum-index column uses `single + double + mix`; non-mixed column is empty.
- Non-MX sub-event → non-mixed sum-index column uses `single + double`; MX column is empty.
- Draw name contains the sub-event name as a prefix → strip it to produce a clean draw label.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST expose `GET /export/enrollment` in the main API export controller, following the same structure as `GET /export/teams`, `GET /export/exceptions`, and `GET /export/locations`.
- **FR-002**: The system MUST support `format=xlsx` (default) and `format=csv` query parameters.
- **FR-003**: The system MUST require authentication; unauthenticated requests MUST return 401.
- **FR-004**: The system MUST require the `edit:competition` permission; requests lacking it MUST return 403.
- **FR-005**: The system MUST validate `eventId` as a non-empty UUID; invalid values MUST return 400.
- **FR-006**: The system MUST return 404 when the `eventId` does not match a known competition.
- **FR-007**: The export MUST contain exactly 12 columns: `Naam`, `Voornaam`, `Lidnummer`, `Geslacht`, `Ploeg`, `Enkel`, `Dubbel`, `Gemengd`, `Afdeling`, `Reeks`, `Somindex gemengde competitie`, `Somindex heren-/damescompetitie`.
- **FR-008**: Rows MUST be ordered by sub-event type ASC, sub-event level ASC, team name ASC, then player sort order.
- **FR-009**: Entries with no team MUST be skipped and a warning MUST be logged server-side (no error thrown, export continues). Unresolvable player IDs MUST be skipped silently.
- **FR-010**: The `Content-Disposition` filename MUST be `{eventName}-enrollment.xlsx` (or `.csv`).
- **FR-011**: The service MUST avoid per-player individual database round-trips; all players for an event MUST be resolved in bulk.

### Key Entities

- **EventCompetition**: The competition being exported; identified by `eventId`.
- **SubEventCompetition**: Groups entries by type (Men/Women/Mixed) and level.
- **DrawCompetition**: Sub-grouping within a sub-event.
- **EventEntry**: One team's enrollment record, containing player metadata (ranking indices, player IDs).
- **Player**: The individual player; provides name, member ID, and gender.
- **Team**: The team the entry belongs to; provides team name and team index.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Authorised users can download the enrollment file in under 5 seconds for competitions with up to 200 enrolled teams.
- **SC-002**: 100% of the existing 12-column schema is preserved — no column is missing or reordered relative to the current export.
- **SC-003**: All four HTTP error codes (400, 401, 403, 404) are returned correctly in their respective scenarios.
- **SC-004**: The existing `EnrollmentController` in `libs/backend/competition/enrollment/` can be deprecated once this endpoint is live.

## Clarifications

### Session 2026-05-08

- Q: When an `EventEntry` has no team, should the service throw, skip silently, or skip with a warning log? → A: Skip with a server-side warning log — export continues with remaining rows, data integrity issue is surfaced in logs.

## Assumptions

- The `edit:competition` permission is already seeded and in use on the existing endpoint — no new permission migration is needed.
- The existing 12-column layout and Dutch column names are correct and must be preserved exactly.
- The `EnrollmentService` in this feature does NOT import `xlsx` directly — it uses `toXlsx`/`toCSV` from `@badman/backend-utils`, consistent with all other export services.
- The existing endpoint in `libs/backend/competition/enrollment/` is not removed as part of this spec — deprecation is a separate concern.
- Player bulk resolution replaces per-player `findByPk` calls to avoid N+1 query performance issues.
