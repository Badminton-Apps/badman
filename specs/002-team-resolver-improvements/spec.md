# Feature Specification: Reliable Team Creation Errors

**Feature Branch**: `002-team-resolver-improvements`
**Created**: 2026-04-30
**Status**: Draft
**Input**: User request to apply the same classified-error, idempotent-submit, and structured-result improvements made to `createEnrollment` (BAD-21 / branch `001-fix-enrollment-submit-error`) to the `createTeam` mutation.

## Background

The `createTeam` mutation currently throws raw NestJS exceptions (`NotFoundException`, `UnauthorizedException`, `BadRequestException`) that reach the GraphQL client as opaque, untyped error objects. The client cannot tell a "club not found" from a "permission denied" from a "player not found", cannot translate error messages, and has no idempotency guarantee when a team with the same cross-season link already exists for the requested season. This makes retries risky and user-facing toasts generic.

This feature makes team-creation failures **classifiable, translatable, and idempotent** — mirroring the same contract delivered by the `createEnrollment` fix — so the user always sees a meaningful, localizable outcome and a retried create does not produce duplicate data or a frightening error.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Clear, classified error on a failed team create (Priority: P1)

When a club admin creates a team and the server cannot accept the request, the response identifies *why* in a structured, machine-readable form so the UI can show the right localized message instead of a raw English error.

**Why this priority**: This is the core parity fix. Without classified errors every failure looks identical on the client; we cannot triage, translate, or recover.

**Independent Test**: Trigger each known failure (club not found, missing permission, player not found, ranking data missing) against the team-create mutation and verify each response carries a distinct stable error code.

**Acceptance Scenarios**:

1. **Given** a `createTeam` call referencing a club that does not exist, **When** the mutation runs, **Then** the server rejects with the stable code `CLUB_NOT_FOUND` and no partial state is persisted.
2. **Given** a user without club-edit permission, **When** they call `createTeam`, **Then** the server rejects with `PERMISSION_DENIED` and no team is created.
3. **Given** the `players` list contains an id that does not exist, **When** the mutation runs, **Then** the server rejects with `PLAYER_NOT_FOUND` carrying the offending player id.
4. **Given** ranking data is missing for a player included in the entry's base lineup, **When** the mutation runs, **Then** the server rejects with `RANKING_NOT_FOUND` carrying the offending player id.
5. **Given** any of the above rejections, **When** the client inspects the GraphQL error, **Then** the error carries a stable `extensions.code` and a short English fallback message — no SQL text, stack frames, or other internal details.

---

### User Story 2 — Idempotent re-create for a team that already exists (Priority: P1)

When a team with the same cross-season link and season already exists and the user (or a retried network request) calls `createTeam` again, the system treats this as success rather than a hard error.

**Why this priority**: Network retries and double-submissions during the enrollment wizard are common. Without idempotency a duplicate call either silently creates a second team record or throws a confusing error when in fact the first submit succeeded.

**Independent Test**: Call `createTeam` for a team; call it a second time with the same `link` and `season`. The second call must return success and must not have created a new team record.

**Acceptance Scenarios**:

1. **Given** a team already exists for a `(link, season)` pair, **When** `createTeam` is called again with the same values, **Then** the mutation returns success pointing at the existing team and no duplicate is created.
2. **Given** the existing team's editable fields (name, captain, preferred day, etc.) differ from the incoming request, **When** `createTeam` is called for the same `(link, season)`, **Then** the existing team's fields are updated to match the request and the response indicates the team already existed.

---

### User Story 3 — Structured success result the client can act on (Priority: P2)

When a team create or update succeeds, the response carries enough identifying information for the client to confirm the outcome unambiguously, rather than relying on the presence or absence of a full Team object.

**Why this priority**: Returning a full domain object on success while throwing an opaque error on failure makes the client-side result handling asymmetric. A lightweight, consistent result envelope (team id + club id + created-vs-updated flag) gives the client a stable contract to correlate per-team outcomes when submitting multiple teams.

**Independent Test**: Submit a valid `createTeam` call and verify the response contains the team id, the club id, and a flag indicating whether this was a newly-created team or an update to an already-existing one.

**Acceptance Scenarios**:

1. **Given** a valid new team request, **When** the mutation succeeds, **Then** the response includes `teamId`, `clubId`, and `alreadyExisted: false`.
2. **Given** a team that already exists for `(link, season)`, **When** the mutation succeeds after updating it, **Then** the response includes `teamId`, `clubId`, and `alreadyExisted: true`.

---

### Edge Cases

- Club id is valid but the calling user holds no edit permission for that club — `PERMISSION_DENIED`.
- One player in the roster list exists, another does not — `PLAYER_NOT_FOUND` for the missing one; the whole operation rolls back (no partial roster is saved).
- Entry's base lineup references players but the primary ranking system has no record for one of them — `RANKING_NOT_FOUND`; whole operation rolls back.
- Two concurrent creates arrive for the same `(link, season)` — exactly one team is persisted; both callers receive success.
- `createTeam` is called with `link` set but no existing team for that `(link, season)` — normal creation path, `alreadyExisted: false`.
- Unexpected database or infrastructure error mid-transaction — full rollback, response carries `INTERNAL_ERROR` code with no internal detail leaked.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The `createTeam` mutation MUST reject calls where the requesting user lacks permission to edit the target club with the stable error code `PERMISSION_DENIED`. Both anonymous callers and authenticated-but-insufficiently-permissioned callers MUST receive this code.
- **FR-002**: The mutation MUST reject calls where the referenced club does not exist with the stable error code `CLUB_NOT_FOUND`.
- **FR-003**: The mutation MUST reject calls where any player id in the `players` list does not exist with the stable error code `PLAYER_NOT_FOUND`, carrying the offending player id in the error payload.
- **FR-004**: The mutation MUST reject calls where ranking data cannot be found for any player included in the entry's base lineup with the stable error code `RANKING_NOT_FOUND`, carrying the offending player id in the error payload.
- **FR-005**: The mutation MUST treat a re-submit for an already-existing team identified by the same `(link, season)` pair as success rather than an error. The existing team's editable fields MUST be updated to reflect the incoming request values.
- **FR-006**: Concurrent creates for the same `(link, season)` MUST result in exactly one persisted team record; all callers MUST receive a success response.
- **FR-007**: On any failure, the mutation MUST roll back all partial database changes so the system never persists a half-created team, partial roster, or partial entry.
- **FR-008**: On success, the mutation response MUST carry the `teamId`, the `clubId`, and a boolean flag (`alreadyExisted`) indicating whether the team was newly created or already existed.
- **FR-009**: Every classified error MUST carry a stable, documented `extensions.code` value (one of: `PERMISSION_DENIED`, `CLUB_NOT_FOUND`, `PLAYER_NOT_FOUND`, `RANKING_NOT_FOUND`). Unclassified server errors MUST surface under `INTERNAL_ERROR` rather than as a raw exception message.
- **FR-010**: Error responses MUST NOT leak implementation details (database error text, SQL, stack frames) to the client.
- **FR-011**: Every classified rejection and `INTERNAL_ERROR` MUST be logged server-side with the offending identifiers, the authenticated user's UUID (no email or other PII), and the error code, at `warn` severity for classified errors and `error` severity for `INTERNAL_ERROR`.

### Key Entities

- **Team Create Request**: User-initiated request to create or upsert a team for a given club and season, optionally including a roster and entry with a base lineup.
- **Team Result**: The outcome of a single create call. Either a success (carrying `teamId`, `clubId`, `alreadyExisted`) or a classified error (carrying a stable code and the diagnostic fields relevant to that code).
- **Cross-Season Link**: The `link` identifier that ties team records across seasons. When provided, used to locate an existing season record before creating a new one.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of `createTeam` failure responses carry one of the documented stable error codes; 0% surface as untyped generic errors.
- **SC-002**: Re-submitting a team create for an already-existing `(link, season)` never produces a user-visible error; it returns success with `alreadyExisted: true`.
- **SC-003**: When a `createTeam` failure occurs, the originating cause can be identified from server logs alone — without contacting the user — in 100% of cases.
- **SC-004**: Sequential re-submits for the same `(link, season)` produce at most one team record, verified by running the create twice.
- **SC-005**: All existing `createTeam` success paths continue to work without regression after the changes are deployed.

## Assumptions

- The fix is applied at the **backend** layer only. Frontend changes to map new error codes to localized copy are out of scope for this spec and will be handled in the active frontend repository separately.
- The legacy Angular frontend in this repo is reference-only and will not be modified.
- The set of classifiable error codes for v1 is the closed list above. Additional codes (e.g. `TEAM_NUMBER_CONFLICT`) are out of scope and can be added in a future iteration without breaking the current contract.
- Idempotency is scoped to the `(link, season)` pair. Teams without a `link` value always create a new record (existing behavior).
- The `createTeams` batch mutation delegates to `createTeam` in a loop; it benefits from the same improvements automatically and does not need separate treatment.
- The mutation return type changes from `Team` to a lightweight `TeamResult` envelope. Clients currently consuming the full `Team` object on success will need to update their queries, but because the change is additive (the team can still be re-fetched by id), this is not a breaking behavioral change.
