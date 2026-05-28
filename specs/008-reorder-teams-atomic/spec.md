# Feature Specification: Atomic Team Reorder

**Feature Branch**: `008-reorder-teams-atomic`
**Created**: 2026-05-05
**Status**: **Superseded (2026-05-12)** by badman-frontend spec 018 (`enrollment-state-rewrite`). The wizard reintroduced client-side team numbering and submits final numbers via `submitEnrollment`; no caller of `recalculateTeamNumbersForGroup` remains. Backend mutation, service, tests, and the `TEAM_NUMBER_CONFLICT` error code were removed. The atomic two-phase write that solved the BAD-152 deadlock still lives in `TeamWriteService.applyTeamNumbersTwoPhase`, exercised by `submitEnrollment`.
**Input**: User description: "Backend fix — team renumber deadlock. Team numbering inside a `(clubId, season, type)` group is derived from each team's `baseIndex` (sum of best players' rankings — lower is stronger). Strongest team gets `1`, next `2`, and so on. Any roster edit, team create, or team import changes one team's `baseIndex` and therefore the numbering for every team in the group. Today the frontend tries to express this re-numbering as parallel partial `updateTeam` calls; they deadlock on a resolver-level uniqueness check and produce `TEAM_NUMBER_CONFLICT`. Provide a server-side primitive that recomputes `(clubId, season, type)` numbering atomically from current rosters."

## Clarifications

### Session 2026-05-05

- Q: MX + NATIONAL number pooling — preserve `nationalCountsAsMixed` joint numbering, or strict per type? → A: PRESERVE. `nationalCountsAsMixed` is real federation logic: NATIONAL teams sit above MX in the division hierarchy (1e nationale and 2e nationale outrank 1e liga), so a club's NATIONAL teams reserve the low slot numbers and MX teams continue from there (e.g. NATIONAL=1, MX=2, MX=3). The flag stays in `createTeam`. The recalculate mutation must accept the same pooling signal and produce numbers consistent with the federation rule.
- Q: Which player subset feeds `baseIndex` for the renumber — base/titular members only, all team members, or best-4 of all members? → A: Base / titular members only — `TeamPlayerMembership` rows whose `membershipType` marks the player as a base/titular for that team. Matches the active frontend and the existing enrollment validator.
- Q: When is the renumber allowed to fire? → A: ONLY during the enrollment phase. Once enrollment is closed for a season, team `teamNumber` / `name` / `abbreviation` are FROZEN — no roster edit, ranking sync, or other mid-season change may rewrite them.
- Q: How does the backend gate "in enrollment" vs "mid-season"? → A: Drop auto-renumber from every existing mutation. Expose a single explicit `recalculateTeamNumbersForGroup(clubId, season, type)` mutation that the enrollment wizard calls deliberately. `updateTeam` / `createTeam` / `createTeams` / `deleteTeam` never trigger a renumber as a side effect — they just write the underlying edit. Mid-season callers never invoke the new mutation, so numbering stays frozen automatically.
- Q: When MX and NATIONAL pool, what is the exact ordering shape? → A: NATIONAL-tier-first, tiered by federation hierarchy. All NATIONAL teams sorted by ascending `baseIndex` take slots `1..K`; all MX teams sorted by ascending `baseIndex` take slots `K+1..K+M`. A weak NATIONAL still outranks a strong MX because the national plays in a higher competition tier. Pooling kicks in for the recalculate mutation when the caller passes the same `nationalCountsAsMixed` signal that already drives `createTeam`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enrollment wizard recalculates the group on demand (Priority: P1)

A club administrator using the enrollment wizard saves a team edit (player added/removed/changed, captain change, new team created, team deleted, bulk import). After each such save, the wizard explicitly calls the new "recalculate team numbers" operation for the affected `(clubId, season, type)` group. The operation reads every team's current base/titular roster, recomputes each team's `baseIndex`, and assigns `teamNumber` `1..N` in ascending `baseIndex` order — strongest team gets `1`. Display `name` and `abbreviation` regenerate to match. The wizard refreshes the group view from the operation's return value.

**Why this priority**: This is the broken flow today. The wizard currently tries to do the renumber client-side and ships it as parallel partial `updateTeam` calls, deadlocking on the resolver-level uniqueness check. Replacing that with one explicit, server-side, atomic operation closes the bug end-to-end.

**Independent Test**: From a club's enrollment-wizard state with two same-type teams whose strengths differ, change one team's roster so the strength order flips, then call the new recalculate operation. Confirm both teams end up with the correct, baseIndex-derived numbers, both names regenerate cleanly (no `_temp`), and no `TEAM_NUMBER_CONFLICT` is raised.

**Acceptance Scenarios**:

1. **Given** two women's teams in the same club/season — team A numbered `1` with `baseIndex` 80 and team B numbered `2` with `baseIndex` 90 — **When** an authorized user changes team B's base roster to drop its `baseIndex` to 70 (via the existing `updateTeam` mutation, which does NOT renumber on its own) and then calls the recalculate operation for that group, **Then** the group contains team B numbered `1` and team A numbered `2`, both display names match the new numbers, and neither team carries a `_temp` suffix.
2. **Given** the recalculate has returned, **When** the database is inspected for that `(clubId, season, type)` group, **Then** the `teamNumber` set is exactly `{1, 2, …, N}` with no gaps or duplicates, the ordering matches ascending `baseIndex` (tie-broken by team `id`), and no team's `name` or `abbreviation` contains `_temp`.
3. **Given** the group is already correctly numbered, **When** the recalculate runs, **Then** no team's `teamNumber` is rewritten and the operation returns success without spurious writes.

---

### User Story 2 - Creating or importing a team and then recalculating (Priority: P1)

A club administrator creates one or more teams in the enrollment wizard (single create, or bulk-import). Each `createTeam` / `createTeams` mutation persists the new team(s) with whatever `teamNumber` value the model defaults to (or whatever the caller submits) — these initial numbers are NOT authoritative. The wizard then calls the recalculate operation for each affected `(clubId, season, type)` group, which reorders all teams in the group by ascending `baseIndex`. After recalculate, every newly-created team has its rank-correct number and name.

**Why this priority**: Same family of trigger as Story 1 — group strength order changes — and it must work for the bulk-create path too. Today the wizard tries to express bulk numbering as parallel partial `updateTeam` calls; tomorrow it calls recalculate once per group at the end of the bulk.

**Independent Test**: With three teams already numbered `1`, `2`, `3`, create a fourth team with `baseIndex` 80 (slotting between current `1` and `2`), then call recalculate. Confirm the resulting group is `{1, 2, 3, 4}` with the new team at `2` and the previously-`2` and `3` teams shifted to `3` and `4`. Repeat the assertion for a bulk-create that adds three teams at once.

**Acceptance Scenarios**:

1. **Given** three teams in a group with `baseIndex` 70 / 90 / 110 (numbers `1` / `2` / `3`), **When** an authorized user creates a fourth team with `baseIndex` 80 and calls recalculate for the group, **Then** after the recalculate the group is numbered `1` (idx 70) / `2` (idx 80, the new team) / `3` (idx 90) / `4` (idx 110), all names regenerate, and no team carries `_temp`.
2. **Given** the same starting state, **When** the user imports several teams via `createTeams` and calls recalculate once for each affected `(clubId, season, type)` group, **Then** each group's final numbering reflects ascending `baseIndex` across the union of existing and imported teams.

---

### User Story 3 - Concurrent recalculate calls never corrupt state (Priority: P1)

The wizard fires multiple recalculate calls in quick succession against the same `(clubId, season, type)` group (e.g. two browser tabs, or a save+refresh storm). The system serializes them per group: each call sees the previous one's persisted state, the final numbering matches the final set of `baseIndex` values, and at no point does a concurrent reader see two teams with the same number, a gap, or a `_temp` suffix.

**Why this priority**: The recalculate operation is the *only* path that writes `teamNumber` from now on. If it isn't safe under concurrency, the underlying production bug is not actually fixed. Mid-season `updateTeam` calls cannot trigger a renumber, so they are not part of this concurrency story; the recalculate operation alone bears the per-group serialization contract.

**Independent Test**: Fire 10 parallel recalculate calls against the same group. Confirm every call either succeeds cleanly or fails with a clear, retryable conflict error; the persisted final state always satisfies the group invariant (contiguous from 1, ascending `baseIndex`, no `_temp`); zero `TEAM_NUMBER_CONFLICT` errors are raised.

**Acceptance Scenarios**:

1. **Given** five teams in one group, **When** ten concurrent recalculate calls execute against that group, **Then** the persisted group still contains the contiguous sequence `1..5`, the ordering matches ascending `baseIndex` of each team's current base roster, and no team carries `_temp`.
2. **Given** a recalculate is in flight for group G and a second recalculate arrives for the same group G, **When** both complete, **Then** the second one operates on the first one's persisted state (not on a snapshot taken before the first started), so its result reflects both the first one's writes and any roster changes that landed between them.

---

### User Story 4 - Mid-season edits never change `teamNumber` (Priority: P1)

After enrollment closes for a season, the active frontend (and any other caller) edits team rosters mid-season for replacement-player workflows, captain changes, contact info, and so on. None of these mid-season edits go through the recalculate operation. The team's `teamNumber`, `name`, and `abbreviation` therefore stay frozen for the rest of the season, regardless of how many roster changes happen, regardless of any ranking-sync update that shifts `baseIndex`.

**Why this priority**: This is the user's hard rule and must be visibly true end-to-end. If `updateTeam` (or any other mutation) accidentally renumbered as a side effect, the bug class returns and team `2` could become team `3` mid-season — which would corrupt schedules, draws, and printed match sheets.

**Independent Test**: After enrollment closes, edit a team's base roster via `updateTeam` so that its post-edit `baseIndex` would, if the recalculate had run, demote it to a lower position. Confirm: the team's persisted `teamNumber` does NOT change; its `name` does NOT regenerate; the rest of the group's numbers also do not change. Confirm again after a ranking-sync run.

**Acceptance Scenarios**:

1. **Given** enrollment is closed and team A is numbered `1`, **When** an authorized user removes team A's strongest base player via `updateTeam`, **Then** team A's `teamNumber` remains `1`, its `name` and `abbreviation` are unchanged, and no other team in the group is modified.
2. **Given** the same starting state, **When** the federation ranking sync runs and updates player rankings such that `baseIndex` orderings would change, **Then** every team in every group keeps its current `teamNumber`, `name`, and `abbreviation`.
3. **Given** enrollment is closed, **When** any code path other than the explicit recalculate operation attempts to write a team's `teamNumber`, **Then** the write is either rejected or has no effect (i.e. there is no other code path that writes `teamNumber`).

---

### User Story 5 - Invalid recalculate calls are rejected cleanly (Priority: P2)

When the recalculate request itself is invalid — caller is not authorized to edit the affected club, the `(clubId, season, type)` triple does not match any club / season, the primary ranking system is missing — the operation rejects without writing. No partial writes occur and the caller receives a precise error code.

**Why this priority**: Defensive correctness. The recalculate is the only path that writes `teamNumber`; its error contract must be tight so an invalid call cannot nudge group state.

**Acceptance Scenarios**:

1. **Given** a user without `edit:club` permission on the affected club, **When** they call recalculate, **Then** the operation is rejected with a permission error and no team in the group is modified.
2. **Given** a recalculate request whose `(clubId, season, type)` does not match any club, **When** submitted, **Then** the operation is rejected with the appropriate not-found error and no team in the group is modified.
3. **Given** the recalculate fails mid-execution for any reason, **When** the failure is raised, **Then** every write attempted by that call is rolled back and the group's persisted state is exactly what it was before the call started.

---

### Edge Cases

- **Group of one**: a single team in a group is always numbered `1`. The recalculate is a no-op write when correct.
- **No teams in the group**: nothing to renumber; the recalculate returns success with an empty result.
- **Tie in `baseIndex`**: two teams with the same `baseIndex` are ordered by team `id` ascending — stable, opaque, reproducible across calls and runs.
- **Team with no base / titular members (or all base members missing rankings)**: `baseIndex` falls back to the documented `getIndexFromPlayers` default; the team is ranked by that fallback value alongside teams with real base rosters.
- **National-competition pooling (federation rule)**: NATIONAL teams sit above MX in the division hierarchy (1e nationale and 2e nationale outrank 1e liga). When the recalculate is invoked for MX with the `nationalCountsAsMixed` signal set, the operation operates on the *pooled set* of MX ∪ NATIONAL teams in the affected `(clubId, season)`. The pooling is tiered: every NATIONAL team takes a slot in `1..K` (sorted by ascending `baseIndex` within the NATIONAL tier), and every MX team takes a slot in `K+1..K+M` (sorted by ascending `baseIndex` within the MX tier). NATIONAL outranks MX even when a specific MX team is "stronger" by `baseIndex`. The same recalculate call writes new numbers for both tiers in one transaction. When the signal is not set, the recalculate operates strictly on the named single type. The existing `nationalCountsAsMixed` flag in `createTeam` stays and continues to drive initial-number assignment.
- **Caller lacks permission on the affected club**: recalculate is rejected; no team modified.
- **Recalculate fails mid-execution**: entire operation rolls back; group's persisted state is unchanged.
- **Concurrent recalculate calls against the same group**: serialized per group; no two recalculates run at the same time on the same `(clubId, season, type)`. The second call observes the first call's writes after it commits.
- **Mid-season `updateTeam` (or any non-recalculate mutation)**: never writes `teamNumber`, `name`, or `abbreviation`. These fields are frozen until the next explicit recalculate call, which only ever fires from the enrollment wizard.
- **Ranking sync changes a player's `RankingLastPlace`**: shifts `baseIndex` arithmetically but does NOT trigger a renumber. Numbers stay frozen until the next enrollment cycle.
- **Reader observes a recalculate in progress**: never sees two teams with the same number, never sees a `_temp` suffix.
- **Unique-constraint collision at the database layer (if such a constraint is added)**: the constraint must be deferrable to commit, or the recalculate must avoid the transient overlap by other means; either way, transient mid-transaction states must not surface as `TEAM_NUMBER_CONFLICT` to the caller.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST expose exactly one explicit GraphQL mutation — `recalculateTeamNumbersForGroup(clubId, season, type, nationalCountsAsMixed)` — that recomputes `teamNumber`, `name`, and `abbreviation` for every team in the affected scope. This mutation is the ONLY path in the system that writes those three fields. The exact input shape is locked in `contracts/team-renumber-mutation.md`.
- **FR-002**: The affected scope and ordering rule are:
  - When `type ∈ { M, F }`: scope is the `(clubId, season, type)` group; team numbers `1..N` are assigned in ascending `baseIndex` order.
  - When `type = NATIONAL` (regardless of `nationalCountsAsMixed`): scope is the `(clubId, season, NATIONAL)` group; team numbers `1..K` are assigned in ascending `baseIndex` order.
  - When `type = MX` and `nationalCountsAsMixed = false`: scope is the `(clubId, season, MX)` group; team numbers `1..M` are assigned in ascending `baseIndex` order.
  - When `type = MX` and `nationalCountsAsMixed = true`: scope is the *pooled* set of NATIONAL ∪ MX teams for that `(clubId, season)`. NATIONAL teams take slots `1..K` ordered by ascending `baseIndex` within the NATIONAL tier; MX teams take slots `K+1..K+M` ordered by ascending `baseIndex` within the MX tier. The same call writes new numbers for both tiers in one transaction.
  - In every case, ties on `baseIndex` MUST be broken by team `id` ascending. The result MUST be reproducible across calls and runs given the same inputs.
- **FR-003**: `baseIndex` for the recalculate MUST be computed from the team's base / titular members only (`TeamPlayerMembership` rows whose `membershipType` marks the player as a base/titular for that team) using the existing `getIndexFromPlayers` helper against the primary `RankingSystem`'s `RankingLastPlace` rows.
- **FR-004**: `updateTeam` MUST NOT write `teamNumber`, `name`, or `abbreviation`. The `teamNumber` field MUST be removed from `TeamUpdateInput`. Roster, captain, contact, and other edits continue to work; they simply leave numbering untouched.
- **FR-005**: `createTeam` and `createTeams` MUST NOT recalculate numbering as a side effect of insertion. They MAY assign a placeholder `teamNumber` on insert (e.g. the existing `MAX(teamNumber)+1` logic, optionally pooled across MX+NATIONAL when `nationalCountsAsMixed=true`, exactly as today) — that value is not authoritative until an explicit recalculate runs. The legacy `nationalCountsAsMixed` flag and its `createTeam` pooling behavior STAY as-is; this feature does not delete them.
- **FR-006**: `deleteTeam` MUST NOT recalculate numbering as a side effect of deletion. Deleting a team in the middle of a group leaves a gap until the next explicit recalculate runs.
- **FR-007**: The recalculate mutation MUST serialize concurrent calls against the same affected scope so that two recalculates never overlap in time. The serialization key MUST cover the pooled set when pooling is in effect (so a recalculate for MX with `nationalCountsAsMixed=true` and a concurrent recalculate for NATIONAL in the same club/season serialize against each other). Concurrent calls against different scopes MUST NOT contend.
- **FR-008**: After every successful recalculate, the affected scope's `teamNumber`s MUST satisfy the ordering rule from FR-002 with no duplicates, no gaps, and no team carrying a `_temp` suffix. After every rejected recalculate, the scope's persisted state MUST equal its pre-call state.
- **FR-009**: When the recalculate writes a team's new `teamNumber`, the system MUST regenerate that team's `name` and `abbreviation` to match. The persisted values MUST NOT contain a `_temp` (or equivalent placeholder) substring at any point that is observable outside the recalculate's own transaction.
- **FR-010**: A recalculate that finds the group already correctly numbered MUST be a no-op write (no rows updated) and MUST NOT raise an error.
- **FR-011**: The recalculate mutation MUST surface distinct failure modes with stable, machine-readable error codes: unauthorized, club-not-found, internal error. The legacy `TEAM_NUMBER_CONFLICT` error MUST NOT be raised by any code path that this feature governs.
- **FR-012**: Authorization for the recalculate mutation MUST be checked against the named club's `<clubId>_edit:club` (or `edit-any:club`) permission before any write. Failure of the authorization check MUST leave the group unchanged.
- **FR-013**: The frontend(s) that today fire parallel partial `updateTeam` calls to express renumbering MUST stop sending `teamNumber` as part of any team mutation, and MUST call `recalculateTeamNumbersForGroup` explicitly from the enrollment wizard after each save (and once per affected scope at the end of each bulk operation). When the wizard is operating on a club whose MX teams pool with NATIONAL teams, the FE passes `nationalCountsAsMixed=true` so the single recalculate call writes both tiers. Backend and frontend changes ship together. Mid-season callers (anything outside the enrollment wizard) MUST NOT call the recalculate mutation.
- **FR-014**: Ranking sync (federation refresh of `RankingLastPlace`) MUST NOT trigger the recalculate. Numbering remains frozen between explicit recalculate calls regardless of how rankings shift.

### Key Entities

- **Team**: a competing unit within a club for a given season and competition type. Identifying attributes for this feature: `id`, `clubId`, `season`, `type`, `teamNumber`, and the derived display fields `name` and `abbreviation`.
- **Team Group**: the implicit collection of all teams sharing `(clubId, season, type)`. The numbering invariant (contiguous from 1, ordered by ascending `baseIndex`) applies within a group, never across groups.
- **Base Index**: a numeric strength score for a team derived from the player rankings of its **base / titular** members only — the players whose `TeamPlayerMembership.membershipType` marks them as the team's base set. Lower `baseIndex` = stronger team. Computed by the same `getIndexFromPlayers` formula already used by the active frontend (for the displayed team-strength label) and by the backend enrollment validator; this feature consumes it, does not redefine it.
- **Recalculate Mutation**: a single explicit GraphQL mutation that, when called, recomputes numbering for the affected scope (a single-type group, or the MX+NATIONAL pooled set when the caller signals it). The ONLY path in the system that writes `teamNumber`, `name`, or `abbreviation`. Called by the enrollment wizard at known points; never called from mid-season flows.
- **Recalculate Result**: the post-operation snapshot of the affected scope's teams (id, new `teamNumber`, regenerated `name`/`abbreviation`) returned to the caller so the UI can refresh without a follow-up read. When pooling is in effect, the result lists both NATIONAL and MX teams in their final order.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After rollout, the count of `TEAM_NUMBER_CONFLICT` errors raised by `updateTeam` (or any successor mutation) over a one-week production window is zero, against a baseline of multiple occurrences per active enrollment session today.
- **SC-002**: A user who edits a roster, creates a team, or imports teams sees the resulting renumbered group reflected in the UI within 1 second on a typical broadband connection, with no manual retry and no flicker showing missing players or blank divisions.
- **SC-003**: A stress test of 10 concurrent renumber-triggering operations against the same `(clubId, season, type)` group leaves the database in a valid state (contiguous `1..N`, ordered by ascending `baseIndex`, no `_temp`) on 100% of runs.
- **SC-004**: For every `(clubId, season, type)` group in the production database, the set of `teamNumber`s forms the contiguous sequence `1..N` ordered by ascending `baseIndex`, with zero violations measured at any point after rollout.
- **SC-005**: Invalid triggers (unauthorized, unknown id, malformed input) are rejected with a machine-readable error code in 100% of cases, with zero observable side effects on the affected group.

## Assumptions

- The recalculate operates on either a single `(clubId, season, type)` group, or — for `type=MX` with `nationalCountsAsMixed=true` — the pooled MX+NATIONAL scope of that `(clubId, season)`. The caller (the enrollment wizard) decides which by passing the flag.
- "Strongest" is defined as the lowest `baseIndex` value, computed by the existing `getIndexFromPlayers` utility. This feature does not redefine the formula; it only consumes it.
- Tie-breaker on `baseIndex` is team `id` ascending. Stable, opaque, reproducible.
- The contiguous-numbering invariant — every group's `teamNumber`s are exactly `1..N` for the N teams in the group, ordered by ascending `baseIndex` — is treated as a hard invariant this feature is allowed to enforce. The new primitive normalizes any drift on its first call against a group, so no separate backfill is needed.
- The legacy `_temp` name suffix is a defect that the broken `updateTeam` shift block could leave behind, but it is confined to local and staging environments — production has not exhibited it. No data-cleanup migration ships with this feature; the new primitive simply never produces `_temp` going forward, and any local/staging row gets corrected the first time its group is renumbered.
- Authorization reuses the existing club-edit permission model (`<clubId>_edit:club`, `edit-any:club`). No new permission types are introduced.
- The active (Next.js) enrollment frontend is updated in the same release; the legacy Angular enrollment frontend (this repo, `apps/badman/`) is not in scope per the constitution's legacy-frontend boundary.
- The `getIndexFromPlayers` helper is already available backend-side (used in enrollment validation) and can be reused without an architectural change. Player rankings (`RankingLastPlace` for the primary system) are likewise already loaded by adjacent flows.
