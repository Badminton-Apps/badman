# Feature Specification: Twizzit Duplicate Detection

**Feature Branch**: `017-twizzit-duplicate-detection`
**Created**: 2026-05-15
**Status**: Draft
**Input**: User description: "After spec 016 populates twizzit.shadow_contact, compare shadow data against existing public.Players to find duplicate players. Two detection modes: (1) Twizzit-side duplicates — multiple shadow_contact rows sharing the same (first_name, last_name, date_of_birth) natural key; (2) Badman-side duplicates — multiple public.Players rows mapping to the same Twizzit contact via member_id or (firstName, lastName, dateOfBirth) match. Output a CSV report per duplicate group. Script-based, not a new API endpoint. Depends on spec 016 shadow tables being populated. Staging first, then production."

## Clarifications

### Session 2026-05-15

- Q: Should the report include shadow contacts with no matching Badman Player (potential new players), or duplicates/conflicts only? → A: Duplicates and conflicts only — unmatched shadow contacts (new player import) are out of scope for this script.
- Q: Should the script detect duplicates within the shadow table itself, or only compare shadow contacts against existing Badman Players? → A: The output is entirely about Badman Players. Shadow contacts are used as the lookup reference. A duplicate is found when 2+ Badman Player records match the same shadow contact (via memberId or firstName+lastName+DOB). The shadow table itself is not checked for internal duplicates.
- Q: What is the matching priority between memberId and natural key (name+DOB)? → A: memberId is the primary key and should not be empty. Natural key (firstName+lastName+DOB) is only used as fallback when memberId is missing on either side. Additionally, if a natural-key match is found and the shadow contact has a memberId but the Badman Player does not, the CSV must flag the Player as missing its memberId and include the Twizzit memberId value.

## Scope clarifier *(read first)*

This specification covers **detection and reporting only**: finding Badman `public."Players"` records that are duplicates of each other, using Twizzit shadow contacts as the source-of-truth reference. A duplicate is confirmed when two or more Badman Player rows match the same shadow contact.

**In scope**

- Finding Badman Player rows that are duplicates of each other, confirmed by both mapping to the same Twizzit shadow contact (matched via `memberId` or `firstName + lastName + dateOfBirth`)
- CSV report output per duplicate group for operator review
- A standalone script (like `scripts/backfill-entry-meta.js`) that runs against staging and then production

**Out of scope**

- Merging or deleting duplicate records (manual operator action after review)
- Automated resolution or reconciliation of duplicates
- A new API endpoint or GraphQL mutation
- Any UI for viewing duplicates
- Scheduling or recurring execution — this is a one-off or on-demand report tool
- Reporting shadow contacts that have no matching Badman Player (unmatched contacts belong to the sync engine, not duplicate detection)

## References & dependencies

- **Spec 016** (`016-twizzit-shadow-sync`): Must be completed and shadow tables populated before this script is useful. Specifically `twizzit.shadow_contact` with `twizzit_id`, `first_name`, `last_name`, `date_of_birth`, `member_id`, and the indexes `idx_shadow_contact_natural_key` and `idx_shadow_contact_member_id`.
- **Existing Badman model**: `public."Players"` with columns `id`, `firstName`, `lastName`, `memberId`, `dateOfBirth`, `gender`, `email`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Detect Twizzit-Side Duplicate Contacts (Priority: P1)

As a platform operator, I can identify contacts in the Twizzit shadow dataset that share the same first name, last name, and date of birth — meaning Twizzit itself may have registered the same physical person more than once.

**Why this priority**: Twizzit-side duplicates are the root cause of downstream data quality issues. Detecting them first gives operators visibility into source data integrity before attempting any reconciliation.

**Independent Test**: Can be fully tested by running the script against a staging database where at least one duplicate natural-key group is known to exist, and verifying the CSV lists those groups with the correct Twizzit IDs and counts.

**Acceptance Scenarios**:

1. **Given** the shadow dataset contains two contacts with identical first name, last name, and date of birth, **When** the script runs, **Then** both contacts appear in the CSV as a duplicate group with reason `twizzit-natural-key`.
2. **Given** the shadow dataset contains no natural-key collisions, **When** the script runs, **Then** the Twizzit-duplicate section of the CSV is empty and a summary line confirms zero groups found.
3. **Given** a contact has a null date of birth, **When** the script runs, **Then** null-DOB contacts are grouped separately (null treated as a distinct value, not wildcard-matched).

---

### User Story 2 - Detect Badman-Side Duplicate Players (Priority: P1)

As a platform operator, I can identify cases where two or more Badman player records correspond to the same Twizzit contact, either via matching `memberId` or matching natural key (firstName, lastName, dateOfBirth).

**Why this priority**: Badman-side duplicates cause incorrect ranking, enrollment, and membership data for real players. Identifying them is prerequisite to any safe data cleanup.

**Independent Test**: Can be fully tested by seeding a test environment with two Player rows sharing the same `memberId` and running the script, verifying both appear in the output CSV with reason `member-id-collision`.

**Acceptance Scenarios**:

1. **Given** two Badman Players share the same `memberId`, **When** the script runs, **Then** they appear together in the output CSV with reason `member-id-collision` and the shared `memberId` value.
2. **Given** two Badman Players share the same firstName, lastName, and dateOfBirth but have different or missing `memberId` values, **When** the script runs, **Then** they appear in the output CSV with reason `natural-key-collision`.
3. **Given** a Badman Player has no match in the shadow dataset and no collision with other Players, **When** the script runs, **Then** that player does not appear in any duplicate group.

---

### User Story 3 - CSV Report Output (Priority: P1)

As a platform operator, I can receive a machine-readable CSV file containing all detected duplicate groups so I can review and decide on manual remediation steps.

**Why this priority**: Without a structured output, the detection results cannot be acted upon. The CSV is the primary deliverable of this tool.

**Independent Test**: Can be fully tested by running the script in any environment and verifying the CSV file is written to disk with the expected columns and one row per player in a duplicate group.

**Acceptance Scenarios**:

1. **Given** duplicates are found, **When** the script completes, **Then** a CSV is written to `scripts/` with columns: `groupId`, `matchReason`, `twizzitId`, `memberId`, `badmanPlayerId`, `firstName`, `lastName`, `dateOfBirth`, `gender`, `email`.
2. **Given** the script runs with `--dry-run`, **When** it completes, **Then** the CSV is still written (dry-run only suppresses DB writes, not reporting).
3. **Given** no duplicates are found, **When** the script completes, **Then** the CSV is written with only the header row and a summary is printed to stdout.

---

### Edge Cases

- What happens when `date_of_birth` is null for one or both contacts in a natural-key match — null is treated as a distinct value; two null-DOB contacts with the same name are still grouped.
- What happens when `member_id` is null on a shadow contact — those contacts are excluded from the `member-id-collision` check; only natural-key matching applies.
- What happens when a Badman Player has no corresponding shadow contact at all — the player is not flagged as a duplicate (no match = no collision).
- What happens when the same player appears in both detection modes (member-id-collision and natural-key-collision) — deduplicate by `badmanPlayerId`; report the highest-confidence reason (`member-id-collision` > `natural-key-collision`).
- What happens when the shadow tables are empty (spec 016 not yet run) — the script exits early with a clear message: "Shadow tables are empty; run spec 016 sync first."
- What happens when the script is run against production before staging — the `--env` flag is required; no default to production; staging must be validated first.
- What happens when a duplicate group contains more than 2 players — all members of the group are emitted as separate rows with the same `groupId`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The script MUST match `twizzit.shadow_contact` rows against `public."Players"` rows using `memberId` as the primary key (`sc.member_id = p."memberId"`). This is the definitive match.
- **FR-002**: When `memberId` is missing on either side (null or empty), the script MUST fall back to natural-key matching: `lower(sc.first_name) = lower(p."firstName") AND lower(sc.last_name) = lower(p."lastName") AND sc.date_of_birth IS NOT DISTINCT FROM p."dateOfBirth"`.
- **FR-003**: A duplicate group is formed when **2 or more** `public."Players"` rows match the **same** `sc.twizzit_id`. The script MUST report all Players in that group.
- **FR-004**: When a natural-key match is found and the shadow contact has a `member_id` but the matched Badman Player has no `memberId`, the script MUST flag that Player row in the CSV with `missingMemberId = true` and include the shadow contact's `member_id` as `suggestedMemberId`.
- **FR-005**: The script MUST write results to a CSV file at `scripts/duplicate-report-<env>-<date>.csv` with columns: `groupId`, `matchReason`, `twizzitId`, `memberId`, `badmanPlayerId`, `firstName`, `lastName`, `dateOfBirth`, `gender`, `email`, `missingMemberId`, `suggestedMemberId`.
- **FR-006**: The script MUST print a summary to stdout: total duplicate groups found, total affected players, total players flagged with missing memberId, and the CSV output path.
- **FR-007**: The script MUST exit early with a human-readable error if `twizzit.shadow_contact` contains zero rows, instructing the operator to run spec 016 first.
- **FR-008**: The script MUST support `--env <staging|prod>` to select the target database via the matching `.env.*` file (same pattern as `backfill-entry-meta.js`). No default to production; omitting `--env` uses local.
- **FR-009**: The script MUST support `--dry-run` — detection is read-only by nature; the flag is preserved for consistency. The CSV is still written in dry-run mode.
- **FR-010**: The script MUST assign a `groupId` to each duplicate group (prefixed `MB-N` for memberId matches, `NK-N` for natural-key matches) so rows from the same group are identifiable in the CSV.

### Key Entities

- **Duplicate Group**: A set of two or more records (Twizzit contacts or Badman players) that are suspected to represent the same physical person. Characterised by a `groupId`, `matchReason`, and member records.
- **Shadow Contact**: A row from `twizzit.shadow_contact` (spec 016) with `twizzit_id`, `first_name`, `last_name`, `date_of_birth`, `member_id`.
- **Badman Player**: A row from `public."Players"` with `id`, `firstName`, `lastName`, `dateOfBirth`, `memberId`, `gender`, `email`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The script completes a full duplicate scan on staging in under 5 minutes for a dataset of up to 200,000 shadow contacts and 50,000 Badman players.
- **SC-002**: All duplicate groups identified by the script can be confirmed by a direct SQL query against the same database with no false negatives for exact natural-key or memberId matches.
- **SC-003**: Operators can action the CSV report without requiring any additional data lookups — all identity fields (`firstName`, `lastName`, `dateOfBirth`, `memberId`, `email`) are present in the output.
- **SC-004**: The script produces zero output rows when run against a clean dataset (no collisions), confirming no false positives on unique data.

## Assumptions

- Spec 016 (`016-twizzit-shadow-sync`) has been completed and `twizzit.shadow_contact` is populated before this script is run.
- The script is run on demand by a platform operator, not on a schedule.
- Staging is validated before production — the operator runs `--env staging` first.
- Name comparison is case-insensitive (`lower()`) but no further normalisation (e.g., accent stripping) is applied in v1.
- `memberId` on `public."Players"` refers to the Badman-internal member identifier, which corresponds to the `Member ID` extra-field value extracted from Twizzit contacts (as surfaced in `FederationContact.memberId` by spec 015).
- Merging or deleting identified duplicates is a manual operator decision, out of scope for this script.
- The `pg` Node.js client is used for direct DB access (same as `backfill-entry-meta.js`).
