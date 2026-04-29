# Feature Specification: Reliable Enrollment Submission Errors (BAD-21)

**Feature Branch**: `001-fix-enrollment-submit-error`
**Created**: 2026-04-29
**Status**: Draft
**Input**: Linear BAD-21 — "Error on final submission completion". Source: backend context comment on BAD-21 by arno@dashdot.be.

## Clarifications

### Session 2026-04-29

- Q: Which permissions grant enrollment-submit? → A: Expand to accept a club-scoped enrollment permission in addition to the existing competition-edit permission, so club admins can submit for their own teams.
- Q: Mutation shape — single-team or batch? → A: Keep single-item. One mutation call per `(teamId, subEventId)`; the client aggregates per-call results when submitting multiple teams.
- Q: `ALREADY_ENROLLED` — success or distinct error? → A: Success with a flag in the payload. Re-submitting an already-enrolled pair is not an error; the response distinguishes newly-created from already-existing.
- Q: Invalid / missing JWT — `PERMISSION_DENIED` or transport-layer 401? → A: Anonymous (no token) and authenticated-without-permission both surface as `PERMISSION_DENIED` at the GraphQL layer. Invalid tokens stay as a transport-layer 401 from the global auth guard, unchanged.
- Q: Logging — user identifier shape and log level? → A: Log the user UUID only (no email; PII stays out of logs). Classified rejections at `warn`; `INTERNAL_ERROR` at `error`.

## Background

A user reported that the enrollment submission flow fails with an unexplained error toast at the final submit step. No screenshot or stack trace was captured. The backend mutation that powers this submit (`EnrollmentResolver.createEnrollment(teamId, subEventId)`) throws several distinct failures (season mismatch, missing permission, unique-constraint violation on duplicate enrollment) but most of them surface to the client as a single, untyped `Error` with a raw English message. The client cannot tell these cases apart, cannot translate them, and cannot recover (e.g. silently treat an already-enrolled team as success).

This feature makes enrollment-submit failures **classifiable, translatable, and idempotent** so the user always sees a meaningful outcome and a retried submit does not produce a duplicate-key crash.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Clear, classified error on a failed enrollment submit (Priority: P1)

When a team manager submits an enrollment and the server cannot accept it, the response identifies *why* in a structured, machine-readable form so the UI can show the right localized message in the user's language instead of a raw English error.

**Why this priority**: This is the core defect in BAD-21. Without classified errors, every failure looks the same to the user and to support; we cannot triage, translate, or recover.

**Independent Test**: Trigger each known failure (season mismatch, missing permission, duplicate enrollment, missing team, missing sub-event) against the enrollment-submit mutation and verify the response carries a stable error code distinct from the others.

**Acceptance Scenarios**:

1. **Given** a team whose season does not match the targeted competition's season, **When** the user submits enrollment, **Then** the server rejects the submit with the error code `SEASON_MISMATCH` and a payload containing the offending team season and competition season.
2. **Given** a user without the `edit:competition` permission (and no other matching permission), **When** the user submits enrollment, **Then** the server rejects with `PERMISSION_DENIED`.
3. **Given** a referenced team or sub-event that does not exist, **When** the user submits enrollment, **Then** the server rejects with `TEAM_NOT_FOUND` or `SUB_EVENT_NOT_FOUND` respectively.
4. **Given** any of the above rejections, **When** the client inspects the GraphQL error, **Then** the error carries a stable `extensions.code` value and a human-readable English fallback message — and no implementation detail leaks (no stack frame, no SQL).

---

### User Story 2 — Idempotent re-submit for a team already enrolled (Priority: P1)

When a team is already enrolled in a sub-event and the user (or a retried network request) submits the same enrollment again, the system treats this as success rather than a hard error.

**Why this priority**: Network retries and double-clicks are common at the final submit step. A duplicate-key failure today produces a frightening generic error and can leave the user thinking nothing was saved when in fact the original submit succeeded.

**Independent Test**: Submit an enrollment for `(teamId, subEventCompetitionId)`; submit the same pair a second time. The second call must not return an error and must not create a second `EventEntry`.

**Acceptance Scenarios**:

1. **Given** a team already enrolled in a sub-event, **When** the same enrollment is submitted again, **Then** the mutation returns success and the existing enrollment is preserved unchanged.
2. **Given** two concurrent submits for the same `(teamId, subEventCompetitionId)`, **When** both reach the server, **Then** exactly one `EventEntry` exists afterward and both calls return success.

---

### User Story 3 — Structured success result the client can act on (Priority: P2)

When an enrollment submit succeeds, the response carries enough identifying information for the client to confirm the outcome (which team, which sub-event), rather than a bare boolean.

**Why this priority**: The current return shape makes it ambiguous on the client whether a `falsy` value is a void return or a real failure (this ambiguity is a contributing factor to misleading toasts on the FE). Returning a structured echo lets the client confirm success per call so that when it issues multiple submits (one per team), each result can be matched back to its team.

**Independent Test**: Submit a successful enrollment and verify the response contains the team id, the sub-event id, and a flag indicating whether this was a new enrollment or a no-op (already enrolled).

**Acceptance Scenarios**:

1. **Given** a valid enrollment, **When** the user submits it, **Then** the response includes `teamId`, `subEventCompetitionId`, and a flag distinguishing newly-created from already-existing enrollments.
2. **Given** the client submits multiple teams as separate calls and some succeed while others are rejected, **When** the client correlates results, **Then** each individual response identifies which team and sub-event it belongs to so the client can render a per-team summary.

---

### Edge Cases

- A team and sub-event exist but belong to different seasons (e.g. team in `2026`, sub-event in `2025` because admin seeded under the wrong season). System returns `SEASON_MISMATCH` with both season values in the payload.
- The user is authenticated but lacks `edit:competition`. System returns `PERMISSION_DENIED`, never a generic 500-style error.
- The user is unauthenticated. System returns `PERMISSION_DENIED` (not a transport-layer 401) so the FE error handler treats it consistently with other authorization failures.
- The same team is submitted twice in the same request batch from the FE. Each submit individually completes idempotently; no duplicate is created.
- The mutation is retried after a partially failed transaction. No partial state survives: either the enrollment exists exactly once or not at all.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The enrollment-submit mutation MUST reject any submission that fails authorization with the stable error code `PERMISSION_DENIED`. Anonymous callers (no token) and authenticated-but-insufficiently-permissioned callers MUST both receive this same code. Invalid-token rejections produced by the global authentication guard before the resolver runs are NOT in scope of this contract and remain a transport-layer authentication failure. Authorization MUST succeed for users holding either the existing competition-edit permission OR a club-scoped enrollment permission that authorizes them to submit on behalf of teams belonging to their own club; users holding neither MUST be rejected.
- **FR-002**: The mutation MUST reject submissions whose referenced team does not exist with the stable error code `TEAM_NOT_FOUND`, and submissions whose referenced sub-event does not exist with `SUB_EVENT_NOT_FOUND`.
- **FR-003**: The mutation MUST reject submissions where the team's season does not match the sub-event's competition season with the stable error code `SEASON_MISMATCH`. The error payload MUST include the team's season and the competition's season as separate fields.
- **FR-004**: The mutation MUST treat a re-submission for an already-enrolled `(team, sub-event)` pair as a successful no-op rather than an error. No duplicate enrollment record is created.
- **FR-005**: Concurrent submissions for the same `(team, sub-event)` pair MUST result in exactly one persisted enrollment, and all callers MUST receive a success response.
- **FR-006**: On any failure, the mutation MUST roll back any partial database changes so the system never persists half of an enrollment.
- **FR-007**: On success, the mutation response MUST carry the `teamId`, the `subEventCompetitionId`, and a flag indicating whether the enrollment was newly created or already existed.
- **FR-008**: Every classified error MUST carry a stable, documented `extensions.code` value (one of: `PERMISSION_DENIED`, `TEAM_NOT_FOUND`, `SUB_EVENT_NOT_FOUND`, `SEASON_MISMATCH`). Unclassified server errors MUST surface under a single fallback code (e.g. `INTERNAL_ERROR`) rather than as a raw exception message.
- **FR-009**: Error responses MUST NOT leak implementation details (database error text, SQL, stack frames) to the client. A short English fallback message is acceptable; the structured code is the contract.
- **FR-010**: Every classified rejection and the fallback `INTERNAL_ERROR` MUST be logged server-side with the offending `teamId`, `subEventCompetitionId`, the authenticated user's UUID (if any; email or other PII MUST NOT be logged), and the error code, so that occurrences of BAD-21-class failures can be triaged from logs without asking the client for a screenshot. Classified rejections MUST be logged at `warn` severity; `INTERNAL_ERROR` MUST be logged at `error` severity so ops alerting can distinguish expected validation rejections from true defects.

### Key Entities

- **Enrollment Submit Request**: The user-initiated request to enroll a team into a sub-event. Identifies a target team and a target sub-event competition.
- **Enrollment Result**: The outcome of a single submit. Either a success (carrying the team id, sub-event id, and a created-vs-already-existed flag) or a classified error (carrying a stable code and the diagnostic fields relevant to that code).
- **Season Constraint**: The invariant that a team can only be enrolled into a sub-event whose parent competition is tagged for the same season as the team.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of enrollment-submit failure responses carry one of the documented stable error codes; 0% surface as untyped generic errors.
- **SC-002**: Re-submitting an already-enrolled `(team, sub-event)` pair never produces a user-visible error in QA reproduction of the BAD-21 scenario; it returns success.
- **SC-003**: When the BAD-21 failure recurs for any user, the originating cause can be identified from server logs alone — without contacting the user — in 100% of cases (because the code, ids, and user are logged).
- **SC-004**: Support tickets matching "enrollment final submit error with no detail" trend to zero within one season after rollout.
- **SC-005**: Sequential re-submits for the same `(team, sub-event)` produce at most one enrollment record in the system, verified by re-running the BAD-21 reproducer twice. Hard concurrency (two truly simultaneous in-flight requests racing the application-level idempotency check) is best-effort under the application-level invariant only; tightening to a DB-enforced guarantee is deferred (see `docs/tech-debt.md`).

## Assumptions

- BAD-21 is fixed at the **backend** layer per the user's instruction and the referenced backend-context comment. The active frontend lives in a separate repository and will be updated separately to map the new error codes to localized copy; this spec does not cover those FE changes.
- The legacy Angular frontend in this repo (`apps/badman/`, `libs/frontend/`) is reference-only and will not be modified.
- The set of classifiable error codes for v1 is the closed list above (`PERMISSION_DENIED`, `TEAM_NOT_FOUND`, `SUB_EVENT_NOT_FOUND`, `SEASON_MISMATCH`, plus `INTERNAL_ERROR` as the fallback). Additional codes such as `SUB_EVENT_FULL` are out of scope for this fix and tracked separately.
- Idempotency is scoped to the `(teamId, subEventCompetitionId)` pair. Other forms of duplicate detection (e.g. cross-team) are out of scope.
- "Already enrolled" is treated as success; this is the intended product behavior. If product later wants this to surface as a distinct outcome, a future iteration can add an `ALREADY_ENROLLED` code without breaking the current contract because the success payload already carries a created-vs-existed flag.
- The fix is applied to a single mutation entry point (the existing `createEnrollment` resolver on the GraphQL API). No new public endpoint is introduced.
- The mutation remains single-item (`(teamId, subEventCompetitionId)` per call). Submitting N teams is N independent calls aggregated by the client; no batch / list-input variant is added in this fix.
