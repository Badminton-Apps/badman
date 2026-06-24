# Feature Specification: Encounter Date Change — Multi-Date Proposals & Counter-Offer Flow

**Feature Branch**: `feat/037-encounter-multi-date-proposals`
**Created**: 2026-06-18
**Status**: Draft
**Tickets**: BAD-84, BAD-238, BAD-222, BAD-254, BAD-30, BAD-78, BAD-49, BAD-250, BAD-82

---

## Background

When an encounter date doesn't work for one of the clubs, they negotiate a new date with the opposing team. The current system only supports a single proposed date with no turn-tracking, no counter-offer, and a boolean accepted/rejected state that goes stale. This feature replaces that entire flow with a multi-date proposal model, explicit turn-awareness, per-date status, and home-team-only finalization authority.

---

## Clarifications

### Session 2026-06-18

- Q: Can both home and away teams make proposals? → A: Yes — either party with `change:encounter` permission may propose dates. Only finalization is home-exclusive.
- Q: Does away triage (endorse, reject, add counter-dates) happen in a single combined submission or separate mutations per operation? → A: Single combined submission — endorse, reject, and add dates are sent in one action, producing one `lastActionBy` update and one notification to the home team.

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Home team proposes multiple candidate dates (Priority: P1)

A home-team club admin or captain opens the encounter and proposes one or more dates for moving the encounter. Each date is submitted in a single action. The away team receives a notification that a proposal is waiting.

**Why this priority**: This is the entry point of the entire flow. Nothing else works without it.

**Independent Test**: A home club admin can submit 2+ candidate dates on an encounter and the away team sees them listed as pending.

**Acceptance Scenarios**:

1. **Given** a home club admin with `change:encounter` permission on an upcoming encounter, **When** they submit 3 candidate dates, **Then** all 3 dates are stored as `PENDING`, tagged `proposedBy: HOME`, and the away team receives a notification.
2. **Given** an existing proposal with 2 dates, **When** the home admin adds a 3rd date, **Then** it is appended without touching the existing dates.
3. **Given** the change request deadline has passed, **When** the home admin attempts to submit dates, **Then** the action is rejected with a clear error.
4. **Given** a proposed date falls outside the season bounds (Sep 1 – Apr 30), **When** submitted, **Then** the system rejects that date with an out-of-season error.

---

### User Story 2 — Away team triages proposed dates (Priority: P1)

The away team receives the proposal and responds in a single combined submission: marking dates as tentatively accepted, rejecting individual dates, and/or adding their own counter-offer dates — all in one action.

**Why this priority**: Without this, the away team has no voice and the flow is one-sided.

**Independent Test**: An away club admin can mark one home-proposed date `TENTATIVELY_ACCEPTED`, reject another, and add one of their own — all in one submission — and the home team sees the updated state with a single notification.

**Acceptance Scenarios**:

1. **Given** 3 `PENDING` home-proposed dates, **When** the away team submits a triage (one `TENTATIVELY_ACCEPTED`, one rejected, one new date added), **Then** all changes apply atomically, `lastActionBy` is set to AWAY, and the home team receives exactly one notification.
2. **Given** the away team rejects all dates with no new dates added, **When** no `PENDING` or `TENTATIVELY_ACCEPTED` dates remain, **Then** the request shows "all rejected — away team owes new dates" and the ball is with the away team.

---

### User Story 3 — Home team finalizes the encounter move (Priority: P1)

The home team reviews available dates (those they proposed plus any the away team tentatively accepted or proposed) and selects one to finalize. Only the home team can do this. The encounter is then officially moved to that date.

**Why this priority**: The home team controls the venue — they must have final say.

**Independent Test**: A home club admin can accept one away-endorsed or away-proposed date, which moves the encounter and notifies both parties.

**Acceptance Scenarios**:

1. **Given** a date the away team marked `TENTATIVELY_ACCEPTED`, **When** the home team finalizes it, **Then** `encounter.date` is updated to the new date, that `EncounterChangeDate` becomes `ACCEPTED`, all other live dates become `RESOLVED`, and both teams receive a "moved" notification.
2. **Given** a date proposed by the away team (they endorsed it by proposing it), **When** the home team finalizes it, **Then** the same outcome as above.
3. **Given** the home team tries to finalize a date that is still only `PENDING` (not yet endorsed by away), **Then** the action is rejected — home may only finalize dates the away team can play.
4. **Given** the selected date fails validation (e.g. hall not free, out of season), **When** the home team tries to finalize, **Then** an error is shown and the date remains unaccepted.

---

### User Story 4 — Status column reflects accurate per-viewer state (Priority: P2)

The encounter list shows a turn-aware status per encounter so each party knows at a glance whether they need to act or are waiting.

**Why this priority**: Without this the encounter list column is misleading (existing BAD-238 bug).

**Independent Test**: After each action in the flow above, the status column for that encounter shows the correct label for each party independently.

**Acceptance Scenarios**:

1. **Given** the home team just submitted a proposal, **When** the home team views the encounters list, **Then** they see "Voorstel verzonden"; the away team sees "Actie vereist".
2. **Given** the away team endorsed and returned the ball, **When** each party views the list, **Then** home sees "Actie vereist", away sees "Voorstel verzonden".
3. **Given** all dates were rejected by the home team, **When** each party views the list, **Then** home sees "Actie vereist" (they owe new dates), away sees "Afgewezen — wachten op tegenstander".
4. **Given** the encounter was moved, **When** either party views the list, **Then** they see "Verplaatst".

---

### User Story 5 — Per-date validation symbols (Priority: P3)

Each proposed date shows a symbol (possible / not possible) indicating whether the home venue is free and within team limits on that date, helping the receiving party triage without leaving the page.

**Why this priority**: Useful UX improvement but not a blocker for the core flow.

**Independent Test**: When an away team admin views a proposal, each date shows a green or red symbol based on whether the home hall is free and the team limit is not exceeded.

**Acceptance Scenarios**:

1. **Given** a proposed date that conflicts with another encounter at the home venue, **When** the away team views it, **Then** the date shows a "not possible" symbol.
2. **Given** a proposed date with the home venue free and team limits met, **When** viewed, **Then** a "possible" symbol is shown.

---

### Edge Cases

- What happens when the home team's request window closes mid-negotiation? New dates cannot be added but existing `PENDING`/`TENTATIVELY_ACCEPTED` dates remain actionable.
- What happens if both parties lose `change:encounter` permission after a proposal is open? The request remains visible but neither can act until permission is restored.
- What if the away team adds dates and the home team accepts one of them before the away team rejects any? The accepted date wins; the flow is terminal.
- What if all dates are rejected and neither party re-proposes? The request stays visible showing the stale rejection state — it is never auto-deleted.
- Can the same date be proposed twice (by different parties)? No — the request deduplicates by date/time.
- What if a party responds to only some proposed dates and ignores others? Unaddressed dates remain `PENDING` and continue to exist in the proposal. The triage is valid as a partial response — `lastActionBy` is updated and the turn passes to the other party. The remaining `PENDING` dates stay live until explicitly acted on, or until a sibling date is finalized (at which point they become `RESOLVED`). They are never auto-rejected or auto-removed by a partial triage.

---

## Requirements _(mandatory)_

### Functional Requirements

**Data model**

- **FR-001**: Each encounter MUST have at most one active change request (`EncounterChange`). New proposals always append to the same request rather than creating a new one alongside it.
- **FR-002**: Each proposed date (`EncounterChangeDate`) MUST carry an explicit authorship field indicating whether it was proposed by the home or away party.
- **FR-003**: Each proposed date MUST carry a lifecycle status: `PENDING`, `TENTATIVELY_ACCEPTED`, `ACCEPTED`, `REJECTED`, or `RESOLVED`.
- **FR-004**: The change request MUST track who performed the most recent action (`lastActionBy`: HOME or AWAY) and when (`lastActionAt`).

**Proposal submission**

- **FR-005**: Either party with the appropriate club-level permission MAY submit one or more candidate dates in a single request. There is no maximum number of dates; only season bounds constrain them.
- **FR-006**: Newly submitted dates MUST be appended to the existing request without removing dates already in other states (`TENTATIVELY_ACCEPTED`, `REJECTED`).
- **FR-007**: Submitted dates MUST be within the competition season window (1 Sep – 30 Apr) or be rejected with a clear message.

**Away team triage**

- **FR-008**: The away team MAY mark any `PENDING` home-proposed date as `TENTATIVELY_ACCEPTED`. Multiple dates may hold this status simultaneously.
- **FR-009**: Either party MAY reject any `PENDING` or `TENTATIVELY_ACCEPTED` date individually. `REJECTED` is terminal for that date.
- **FR-010**: The away team's triage response (endorse, reject, add dates) MUST be submitted as a single combined action. This produces exactly one `lastActionBy` update and exactly one notification to the home team.

**Finalization (home only)**

- **FR-011**: Only the home team may finalize an encounter move (set a date to `ACCEPTED`).
- **FR-012**: The home team MAY only finalize a date that the away team has endorsed — either a date the away team marked `TENTATIVELY_ACCEPTED`, or a date the away team proposed (implicitly endorsed by proposing).
- **FR-013**: On finalization, the selected date MUST become `ACCEPTED`; all sibling dates still `PENDING` or `TENTATIVELY_ACCEPTED` MUST become `RESOLVED`; `REJECTED` siblings remain unchanged.
- **FR-014**: Finalization MUST run validation: season bounds, hall capacity (original slot stays occupied until finalized — Option A), and semester/fixture rules. Failure surfaces an error and leaves the date unaccepted.
- **FR-015**: On successful finalization, `encounter.date` (and `encounter.locationId` if changed) MUST be updated, `encounter.originalDate` preserved if not already set, and a sync job enqueued.

**Status column**

- **FR-016**: The system MUST expose a per-viewer derived status field on each encounter (`changeStatus`) computed server-side using the requesting user's party affiliation and the current request state.
- **FR-017**: The status MUST be one of four machine keys: `PROPOSAL_SENT`, `ACTION_REQUIRED`, `REJECTED_WAITING`, `MOVED` — or `null` when no active request exists.
- **FR-018**: The status MUST never be blank while a live or all-rejected request exists.

**Notifications**

- **FR-019**: Notifications MUST always go to the opposing party only — never to the actor themselves.
- **FR-020**: The following events MUST trigger a notification: dates added, away triage submitted (ball returns to home), a date is rejected while others remain live, all dates rejected, date finalized/moved, new chat message. Notification recipients are deferred to planning.

**Migration**

- **FR-021**: Existing `EncounterChange` and `EncounterChangeDate` rows MUST be migrated: `proposedBy` backfilled from the null-trick, `status` from `selected`/`accepted`, `lastActionBy`/`lastActionAt` from newest date metadata.
- **FR-022**: The legacy `EncounterChange.accepted` boolean and `EncounterChangeDate.selected` boolean MUST be removed after the backfill is verified.

### Key Entities

- **EncounterChange**: The singular grouped request per encounter. Carries `lastActionBy` (HOME/AWAY), `lastActionAt`, and a collection of candidate dates.
- **EncounterChangeDate**: One candidate date within a request. Carries `date`, `locationId`, `proposedBy` (HOME/AWAY), `status` (state machine), and computed `availabilityHome`/`availabilityAway` validation symbols.
- **EncounterCompetition**: The encounter being negotiated. Gains a derived `changeStatus` field (per-viewer, server-computed).

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A complete negotiation (propose → endorse → finalize) can be completed by both parties in under 5 minutes of total interaction time.
- **SC-002**: The status column correctly reflects the current turn for 100% of live requests — no stale `accepted` values remain after the migration.
- **SC-003**: Zero cases where a home team can finalize a date the away team has not endorsed (enforced by the server, not only the UI).
- **SC-004**: All existing encounter change records are migrated without data loss — every pre-existing proposal retains its dates, authorship (inferred), and final state.
- **SC-005**: Validation prevents 100% of out-of-season or hall-conflict finalizations from writing to the encounter.

---

## Assumptions

- Both `HOME` and `AWAY` party resolution is based on the encounter's `homeTeamId`/`awayTeamId` and the requesting user's club membership — not a stored party field on the user.
- The proposal submission window (open/close dates) remains stored per `EventCompetition` and is unchanged by this feature.
- The toernooi.nl sync on finalization only runs in production; staging can test all other aspects of the flow.
- The frontend i18n labels ("Voorstel verzonden", etc.) are placeholder Dutch copy; final wording is decided by Arno separately and only requires catalog changes.
- Per-date validation symbols (BAD-82) use the home team's venue and are computed at read time, not stored.
- The hardcoded June 1 – Aug 31 proposal UI window in the frontend is a known issue (BAD-251) and is out of scope for this feature.
- Notification recipients (which specific users on a team receive notifications) are an implementation detail deferred to planning.
