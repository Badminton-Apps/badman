# Feature Specification: Atomic Team Reorder

**Feature Branch**: `008-reorder-teams-atomic`
**Created**: 2026-05-05
**Status**: Draft
**Input**: User description: "Backend fix — team renumber / swap deadlock. Provide an atomic primitive for reordering multiple teams in one transaction so the enrollment UI can swap team numbers without `TEAM_NUMBER_CONFLICT` errors and without leaving teams with `_temp` suffixes."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Swap two team numbers in one click (Priority: P1)

A club administrator is editing teams in the enrollment wizard. They have two women's teams numbered 1 and 2 in the same competition type and season. They drag the second team above the first (or otherwise indicate a swap). The system applies both new numbers as a single atomic operation: team A becomes 2, team B becomes 1, and both teams' display names/abbreviations update accordingly. No error is shown. Players and divisions stay attached to the same teams.

**Why this priority**: This is the broken flow today. Both the legacy and current frontends produce parallel partial update requests for swaps; both halves fail with `TEAM_NUMBER_CONFLICT`, the swap never completes, and the user is left staring at flickering UI with stale data and missing players. Without this primitive, the enrollment step 3 experience is unusable for any club that needs to change team order.

**Independent Test**: Reproduce the original bug scenario (a club with two teams of the same type/season, attempt to swap their numbers via the UI flow, or call the backend reorder operation directly with both new positions). Confirm the swap succeeds in a single round-trip with both teams holding their new numbers and clean (non-`_temp`) names.

**Acceptance Scenarios**:

1. **Given** a club with two same-type/same-season teams numbered 1 and 2, **When** an authorized user requests that team A take number 2 and team B take number 1 in a single reorder operation, **Then** both team numbers update, both display names regenerate to match, and the operation returns success with the final team state.
2. **Given** the swap completes, **When** the database is inspected, **Then** neither team has `_temp` in `name` or `abbreviation`, and the `(clubId, season, type)` group still contains exactly the numbers 1 and 2 (no gaps or duplicates).
3. **Given** the user repeats the same reorder request (same desired numbers), **When** the operation runs again, **Then** it returns the already-final state without error and without producing partial writes.

---

### User Story 2 - Reorder more than two teams at once (Priority: P2)

A club administrator with five same-type teams reshuffles the order — for example, promoting team 5 to position 1 and pushing the others down. The user submits the new ordering as a single batch. All five teams update atomically; the resulting numbers form the contiguous sequence 1–5 with no duplicates and no gaps; all names regenerate to match.

**Why this priority**: Not the headline bug, but the same structural fix naturally extends to N-way reorders, and clubs occasionally do bigger reshuffles (especially when adding or removing a team mid-season). Shipping this as part of P1 closes off the next class of "swap"-style failures.

**Independent Test**: Submit a batch reorder for ≥3 teams in the same group with a permutation that requires every team's number to change. Verify all updates land, the group invariant holds, and a single round-trip suffices.

**Acceptance Scenarios**:

1. **Given** five teams numbered 1–5 in a group, **When** the user submits a permutation that maps every team to a new number, **Then** all five teams reflect the new numbers, names match, and the group still holds exactly {1,2,3,4,5}.
2. **Given** a partial reorder (only some teams in the group are listed), **When** the resulting full state would still be contiguous starting at 1 with no duplicates, **Then** the operation succeeds and only the listed teams are touched.

---

### User Story 3 - Invalid reorder requests are rejected cleanly (Priority: P2)

When the request would leave the team-numbering invariant broken — duplicates, gaps, mixed clubs/seasons/types, unknown team ids, or unauthorized clubs — the system rejects the entire request before any team is changed. The user gets a precise error code identifying the violation. No team is left half-updated, and no `_temp` suffixes appear.

**Why this priority**: The backend is the source of truth for the numbering invariant. If invalid input could partially apply, every downstream consumer (rankings, schedules, displays) would have to defend against broken state. Rejecting cleanly is mandatory for safe rollout, but the happy path (P1) is what unblocks users today.

**Acceptance Scenarios**:

1. **Given** a reorder request with two teams mapped to the same number, **When** submitted, **Then** the request is rejected with a "duplicate number" error and no team is modified.
2. **Given** a reorder request whose resulting numbers contain a gap (e.g. {1,2,4} with no team at 3), **When** submitted, **Then** the request is rejected with a "non-contiguous" error and no team is modified.
3. **Given** a reorder request that mixes teams from different clubs, seasons, or types, **When** submitted, **Then** the request is rejected with a "mixed group" error and no team is modified.
4. **Given** a reorder request that references a team id that does not exist or that the user is not authorized to edit, **When** submitted, **Then** the request is rejected with the appropriate authorization or not-found error and no team is modified.

---

### User Story 4 - Concurrent reorders never corrupt state (Priority: P2)

Two club administrators (or two browser tabs) submit reorder requests for the same club's team group at nearly the same time. The system serializes them: at most one fully succeeds, the other is rejected cleanly, and the persisted state always satisfies the contiguous-numbering invariant.

**Why this priority**: Real users do submit duplicate clicks and overlapping edits. The fix must not turn the existing deadlock into a different kind of corruption (split brain, dangling `_temp`).

**Acceptance Scenarios**:

1. **Given** ten concurrent reorder requests against the same club/season/type group, **When** they all execute, **Then** at most a deterministic subset succeeds, the rest fail with a clear concurrency/conflict error, and the persisted group still contains the contiguous sequence with no duplicates and no `_temp`.

---

### User Story 5 - Legacy `_temp` suffixes are cleaned up (Priority: P3)

Any teams whose `name` or `abbreviation` was left with a `_temp` suffix by the previous (broken) update path are identified and corrected so that no production team carries the leftover marker.

**Why this priority**: It's a hygiene task that does not block the P1 fix, but the same release should leave the dataset clean so support staff and downstream queries don't have to special-case the suffix.

**Acceptance Scenarios**:

1. **Given** the system contains teams with `_temp` in `name` or `abbreviation` due to prior failures, **When** the cleanup runs, **Then** every such team's display fields are regenerated to match its current `teamNumber` and the `_temp` marker is gone.
2. **Given** the cleanup has run, **When** the database is queried for any field containing the `_temp` substring, **Then** zero rows are returned.

---

### Edge Cases

- **Empty change set**: a reorder with no listed teams is a no-op and returns success without touching any team.
- **No-op reorder**: every listed team already has its requested number — return success and confirm the (unchanged) final state.
- **Same number assigned twice in input**: rejected as a duplicate (see User Story 3).
- **Gaps in resulting state**: rejected as non-contiguous (see User Story 3).
- **Mixed `(clubId, season, type)`**: rejected as a cross-group request (see User Story 3).
- **Unknown team ids**: rejected as not-found.
- **Caller lacks permission on the affected club**: rejected as unauthorized; no team modified.
- **Number out of range** (e.g. 0, negative, very large): rejected as invalid input.
- **Underlying database constraint violation at commit time** (e.g. due to a concurrent writer): the entire reorder rolls back; no partial state is persisted; the caller receives a conflict-style error.
- **Partial reorder that would leave the group non-contiguous after the change is applied**: rejected, even if the listed teams alone look fine.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST expose an operation that accepts a batch of "team → desired number" pairs and applies all of them atomically (either every change persists or none do).
- **FR-002**: The system MUST reject the entire batch — without modifying any team — if any of the following hold for the request: the listed teams span more than one `(clubId, season, type)` group; any listed team id does not exist; the caller is not authorized to edit the affected club; the same desired number is assigned to two listed teams; or the resulting set of numbers within the affected group is not a contiguous sequence starting at 1.
- **FR-003**: When the batch succeeds, the system MUST regenerate each affected team's display name and abbreviation so that they remain consistent with the new `teamNumber`. The persisted display fields MUST NOT contain a `_temp` (or equivalent placeholder) suffix.
- **FR-004**: The system MUST guarantee that, both before and after every successful or rejected reorder, every `(clubId, season, type)` group's `teamNumber`s form a contiguous sequence starting at 1, with no duplicates and no gaps.
- **FR-005**: The system MUST be safe under concurrent reorder requests against the same group: at most one wins the race, others are rejected with a clear conflict error, and no partial or contradictory state is ever persisted or visible to readers.
- **FR-006**: The system MUST return the final state of the affected teams (at minimum: id, new `teamNumber`, regenerated display name and abbreviation) on success so the caller can refresh its view without a follow-up read.
- **FR-007**: A repeated reorder request with the same desired final state MUST succeed and yield the same final state, without producing additional writes or errors.
- **FR-008**: The existing single-team update operation MUST continue to work for edits that do not change `teamNumber` (e.g. player roster, captain, contact info). Renumbering operations SHOULD be migrated off the single-team operation onto the new atomic primitive; the single-team operation MUST NOT silently produce the deadlock failure mode that motivated this work.
- **FR-009**: Authorization MUST be checked against the affected club(s) before any database write occurs. Failure of the authorization check MUST result in zero modifications.
- **FR-010**: Distinct failure modes (unauthorized, not-found, mixed group, duplicate number, non-contiguous result, concurrency conflict, generic invalid input) MUST be reported with distinct, machine-readable error codes so that callers can react programmatically without parsing error strings.
- **FR-011**: Every team currently persisted with a `_temp` substring in its display name or abbreviation MUST be detected and corrected as part of this work, such that immediately after rollout no production team carries the suffix.
- **FR-012**: Frontend(s) that today implement renumbering as parallel partial single-team updates MUST be updated in lockstep with this backend change to instead use the new atomic primitive, so that the user-visible bug is closed end-to-end.

### Key Entities

- **Team**: a competing unit within a club for a given season and competition type. Its identifying business attributes for this feature are: `id`, `clubId`, `season`, `type`, `teamNumber`, and the derived display fields `name` and `abbreviation`.
- **Team Group**: the implicit collection of all teams sharing the same `(clubId, season, type)`. The numbering invariant (contiguous from 1, no duplicates) applies within a group, never across groups.
- **Reorder Request**: a set of `{ teamId, desiredTeamNumber }` pairs submitted as a single atomic intent. All listed teams must belong to the same Team Group.
- **Reorder Result**: the post-operation snapshot of the affected teams returned to the caller, sufficient for the UI to refresh without a follow-up query.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After rollout, the user-reported failure pattern (parallel team-number swap producing two `TEAM_NUMBER_CONFLICT` errors and stale UI) occurs zero times in a one-week observation window covering the same enrollment flow that previously reproduced it daily.
- **SC-002**: A user who needs to swap two team numbers in the enrollment wizard can complete the swap in a single user action and see the result reflected within 1 second on a typical broadband connection — no manual retries, no page refresh.
- **SC-003**: Across the full production team table, the count of teams whose display name or abbreviation contains the `_temp` substring is zero immediately after the cleanup runs and remains zero in subsequent weekly audits.
- **SC-004**: A stress test of 10 concurrent reorder requests against the same group leaves the database in a valid state (contiguous numbering, no duplicates, no `_temp`) on 100% of runs, with a deterministic single winner and clean rejections for the rest.
- **SC-005**: For every `(clubId, season, type)` group in the production database, the set of `teamNumber`s forms a contiguous sequence starting at 1, with zero violations measured at any point after rollout.
- **SC-006**: Invalid reorder requests (duplicates, gaps, cross-group, unknown id, unauthorized) are rejected with a machine-readable error code in 100% of cases, with zero partial writes detectable in audit logs.

## Assumptions

- Renumbering is always scoped to a single `(clubId, season, type)` group. Cross-group renumbering is intentionally out of scope; clients that need to move a team across groups will continue to do so via a separate operation.
- The contiguous-numbering invariant — every group's `teamNumber`s are exactly `1..N` for the N teams in the group — is treated as a hard invariant that this feature is allowed to enforce and rely upon. Existing data that violates it is considered a defect to be remediated by the cleanup step (FR-011) or out-of-band, not a state the new operation must preserve.
- The existing single-team update operation continues to be the right surface for non-numbering edits (players, captain, etc.); only the renumber path is being replaced.
- Authorization for renumbering reuses the existing club-edit permission model (`<clubId>_edit:*` style permissions). No new permission types are introduced.
- The frontend that today triggers the deadlock (the new Next.js enrollment wizard) is updated in the same release; the legacy Angular enrollment frontend is in maintenance mode and may continue to use the single-team path for non-numbering edits, but is not expected to gain a renumber feature.
- The cleanup of legacy `_temp` rows (FR-011) is a one-shot remediation tied to this release. Going forward, the new atomic primitive does not produce `_temp` markers, so no recurring cleanup job is required.
- "Concurrent reorder" safety is bounded to the granularity of a single team group; reorders against different groups (different club, season, or type) do not contend with each other.
