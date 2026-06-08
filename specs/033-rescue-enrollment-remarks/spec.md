# Feature Specification: Rescue Enrollment Remarks

**Feature Branch**: `033-rescue-enrollment-remarks`
**Created**: 2026-06-08
**Status**: Draft

## Background

A bug in the frontend enrollment wizard caused club admins' remarks to be saved only to browser localStorage and never submitted to the backend during enrollment. Enrollments are now closed. This feature provides a one-time rescue path to collect and persist those stranded remarks.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Club Admin Submits Rescued Remarks (Priority: P1)

A club admin still has their enrollment remarks in localStorage from before enrollment closed. They use the frontend rescue UI to submit those remarks to the backend.

**Why this priority**: Core purpose of this feature — without this flow, remarks are lost permanently.

**Independent Test**: Can be fully tested by submitting a `saveEnrollmentRemarks` mutation with a valid `clubId`, `season`, and non-empty `remarks` and confirming a new record exists in `enrollment_remarks`.

**Acceptance Scenarios**:

1. **Given** a valid `clubId`, a season number, and non-empty remarks text, **When** the mutation is called, **Then** the remarks are persisted and the mutation returns `true`.
2. **Given** the same `clubId` and `season` submitted twice, **When** the mutation is called a second time, **Then** a second record is created (no uniqueness constraint — multiple submissions are allowed as rescue data).
3. **Given** an optional `adminEmail` is provided, **When** the mutation succeeds, **Then** the email is stored alongside the remarks.
4. **Given** no `adminEmail` is provided, **When** the mutation succeeds, **Then** the record is created with a null email field.

---

### User Story 2 - Invalid Input Rejected (Priority: P2)

The mutation rejects requests that would produce invalid or useless data.

**Why this priority**: Prevents garbage data from cluttering the rescue table.

**Independent Test**: Submit the mutation with an unknown `clubId` or empty `remarks` and verify an error is returned.

**Acceptance Scenarios**:

1. **Given** a `clubId` that does not exist in the system, **When** the mutation is called, **Then** it returns an error indicating the club was not found.
2. **Given** an empty string for `remarks`, **When** the mutation is called, **Then** it returns an error indicating remarks must be non-empty.
3. **Given** a whitespace-only `remarks` value, **When** the mutation is called, **Then** it is treated as empty and rejected.

---

### Edge Cases

- What happens when `adminEmail` is provided but malformed? — Accepted as-is; the field is informational only and not validated (rescue context, best-effort data).
- What happens when the same club submits multiple times? — Each submission creates a new row; no deduplication.
- What happens when `season` is outside plausible range? — No range validation; stored as provided.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST expose a `saveEnrollmentRemarks` GraphQL mutation accepting `clubId` (required), `season` (required), `remarks` (required), and `adminEmail` (optional).
- **FR-002**: System MUST validate that the club identified by `clubId` exists before inserting; return an error if not found.
- **FR-003**: System MUST reject requests where `remarks` is empty or whitespace-only; return an error.
- **FR-004**: System MUST persist the remarks to a dedicated `enrollment_remarks` table with columns: `id` (UUID PK), `clubId` (FK → Club), `season` (INT), `remarks` (TEXT), `submittedByEmail` (VARCHAR, nullable), `source` (ENUM: `rescue` | `normal`, hardcoded to `rescue`), `createdAt` (TIMESTAMP, auto-set).
- **FR-005**: System MUST return `true` on successful insertion.
- **FR-006**: System MUST apply the existing authentication guard — authenticated session required, no additional permission check beyond what the frontend already gates.
- **FR-007**: System MUST NOT modify the existing `submitEnrollment` mutation or `SubmitEnrollmentInput` shape.

### Key Entities

- **EnrollmentRemark**: Persisted record of club admin remarks. Attributes: id, clubId, season, remarks, submittedByEmail, source, createdAt. Belongs to Club.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All clubs whose admins submit rescued remarks have their data stored within one round-trip — zero silent data loss.
- **SC-002**: Invalid submissions (unknown club, empty remarks) are rejected with a clear error message on 100% of attempts.
- **SC-003**: Existing enrollment submission flow is unaffected — zero regressions in `submitEnrollment` behavior.
- **SC-004**: Rescued remarks are accessible for manual review by the operations team immediately after submission.

## Assumptions

- The `source` field is hardcoded to `rescue` for all records created via this mutation; the `normal` value is reserved for future use when the main submission flow is fixed.
- No deduplication is enforced — multiple submissions by the same club are accepted (rescue context, better to have duplicates than missing data).
- `adminEmail` is informational only; no email validation or notification is performed.
- The frontend rescue UI already gates access so only legitimate club admins trigger this mutation; no additional server-side permission check is added beyond authenticated session.
- The `enrollment_remarks` table is append-only; no update or delete mutation is provided in this feature.
- A database migration creates the `enrollment_remarks` table and its `source` ENUM type before deployment.
