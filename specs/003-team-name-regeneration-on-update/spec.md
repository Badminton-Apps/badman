# Feature Specification: Team Name Stays Current After Edit

**Feature Branch**: `003-linear-bad-127`
**Created**: 2026-04-30
**Status**: Draft
**Linear**: [BAD-127](https://linear.app/dashdot/issue/BAD-127) — Priority: High

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Admin edits team number and sees the correct name (Priority: P1)

An admin changes a team's number (e.g. from 5 to 4 because another team was deleted). After saving, the displayed team name reflects the new number — the sport system of record, enrollment wizard, and any exported data all show the updated name immediately.

**Why this priority**: Name/number drift corrupts enrollment documents and leaderboards. Every downstream user sees wrong data until manually corrected.

**Independent Test**: Can be fully tested by updating a team's number and verifying the stored name matches, without touching any other feature.

**Acceptance Scenarios**:

1. **Given** a team named "Herne 5H" with number 5, **When** an admin updates the team number to 4, **Then** the team name is stored and displayed as "Herne 4H".
2. **Given** a team with number 3 in a men's category, **When** nothing relevant changes (e.g. only a description field is touched), **Then** the team name is not regenerated unnecessarily.

---

### User Story 2 — Admin changes team type and sees correct gender notation (Priority: P2)

An admin changes a team's type (e.g. from men's to mixed). After saving, the gender indicator in the team name updates to match (e.g. "H" becomes "G" in Belgian notation).

**Why this priority**: Type changes are less frequent than number changes, but produce identical stale-name corruption with enrollment impact.

**Independent Test**: Can be tested independently by updating a team's type and verifying the stored name reflects the new notation.

**Acceptance Scenarios**:

1. **Given** a team with a men's type whose name ends in "H", **When** an admin updates the type to mixed, **Then** the team name is stored with the mixed gender indicator (e.g. "G").
2. **Given** a team in a mixed category, **When** the type is updated to women's, **Then** the team name is stored with the women's gender indicator.

---

### User Story 3 — Enrollment wizard can update teams without delete-then-create workaround (Priority: P3)

When the enrollment wizard renumbers teams (because a team is added or removed in the same gender category, or player changes shift base-index rankings), it can update team numbers directly. It no longer needs to delete and recreate teams to force name regeneration.

**Why this priority**: Unblocks cleaner enrollment flow (BAD-17, BAD-121) and removes a data-integrity risk where delete-then-create drops relational history.

**Independent Test**: Can be tested by simulating the enrollment renumbering path and verifying all affected teams have updated names without any delete operations.

**Acceptance Scenarios**:

1. **Given** a club with teams 1–5 in men's, **When** team 3 is deleted and the remaining teams are renumbered, **Then** all surviving teams have names matching their new numbers after a single update operation per team (no delete-then-create).
2. **Given** the enrollment wizard updating multiple teams in one submission, **When** bulk team numbers change, **Then** all team names reflect their new numbers after the operation completes.

---

### Edge Cases

- Team number changes to a value already held by another team in the same club/category — the update MUST be rejected with `code: TEAM_NUMBER_CONFLICT` and `conflictingTeamId: <uuid>`; the caller is responsible for resolving the conflict before retrying.
- Bulk rename of multiple teams in one action — all must regenerate, not just the first.
- Update touches only unrelated fields (notes, scheduling preference) — name must not change.
- Club's display-name setting changes — regenerating names for all club teams is **out of scope** for this fix (separate ticket if needed).

## Clarifications

### Session 2026-04-30

- Q: Should name regeneration on update also regenerate the abbreviation in the same operation? → A: Yes — both name and abbreviation regenerate together on every relevant update.
- Q: What happens when an update would assign a team number already held by another team in the same club/category? → A: Reject the update — return an error; caller must resolve the conflict explicitly.
- Q: Should bulk team renumbering be atomic (all-or-nothing) or best-effort? → A: Atomic — entire batch rolls back if any single team update fails.

### Session 2026-05-01

- Q: Should the @BeforeBulkCreate double-abbreviation-call fix be in scope for BAD-127? → A: Yes — in scope; add to spec and acceptance criteria.
- Q: Should the team number conflict error include the conflicting team's ID? → A: Yes — include `conflictingTeamId` in error extensions so clients can navigate without an extra lookup.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When a team's number changes, the system MUST immediately update the team's stored name and abbreviation to reflect the new number.
- **FR-002**: When a team's type changes, the system MUST immediately update the team's stored name and abbreviation to reflect the new type notation.
- **FR-003**: When neither the team number nor the type changes during an update, the system MUST NOT regenerate the team name or abbreviation (no unnecessary churn).
- **FR-004**: When multiple teams are updated in a single batch operation, the system MUST regenerate names and abbreviations for all affected teams, not only the first. The batch MUST be atomic — if any single team update fails, the entire batch rolls back with no partial changes persisted.
- **FR-005**: The name regeneration on update MUST use the same logic as name generation on creation — no separate or divergent rules.
- **FR-006**: The enrollment wizard MUST be able to renumber teams via direct update (no delete-then-create required to obtain correct names).
- **FR-007**: If a team update would assign a number already held by another team in the same club and gender category, the system MUST reject the update with a machine-readable error containing `code: TEAM_NUMBER_CONFLICT` and `conflictingTeamId: <uuid>` so clients can identify and navigate to the blocking team without an extra request.
- **FR-008**: When teams are created in bulk, the system MUST generate each team's abbreviation exactly once per team — no double-processing. (Fixes latent `@BeforeBulkCreate` double-call bug.)

### Key Entities

- **Team**: Has a number, type, and a derived name and abbreviation. Name/abbreviation are computed from number + type + club display settings.
- **Enrollment Wizard**: Process that assigns and renumbers teams within a gender category during a competition season enrollment.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of automated tests for number-change, type-change, and no-op update scenarios pass before release — covering both name and abbreviation fields.
- **SC-002**: Zero cases in post-release QA where a team's displayed name does not match its stored number after an admin update.
- **SC-003**: Enrollment wizard renumbering produces correct names for all affected teams in a single pass — verified by automated test covering ≥5 teams renumbered in one operation.
- **SC-004**: Existing enrollment and team-creation flows (BAD-121, BAD-17) pass their own acceptance criteria without relying on delete-then-create as a name-sync workaround.
- **SC-005**: Automated test confirms bulk team create calls `generateAbbreviation` exactly once per team instance (spy-verified, ≥2 teams in batch).

## Assumptions

- Changing the club that owns a team (reassigning `clubId`) is extremely rare and excluded from automatic name regeneration in this fix; a separate ticket handles it if needed.
- The existing name-generation logic (used on create) is correct; this fix only ensures it also runs on update.
- Typo corrections in existing method names (`setAbbriviation`) are out of scope for this issue.
- One-off migration to fix historically stale team names in production is out of scope; if needed, a separate data-repair task will be created.
- BAD-119 (base-index formula correctness) is independent and not part of this fix.

## Dependencies

- BAD-121: Frontend enrollment bug (teams not created on backend) — benefits from this fix but is a separate issue.
- BAD-17: Automatic team renumbering — this fix is a prerequisite for BAD-17's clean update path.
