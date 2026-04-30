# Feature Specification: Filter Club Players by Membership Fields

**Feature Branch**: `005-club-players-nested-where`
**Created**: 2026-04-30
**Status**: Draft
**Linear**: [BAD-132](https://linear.app/dashdot/issue/BAD-132) — Priority: Urgent

## Clarifications

### Session 2026-04-30

- Q: How should the `Club.players` resolver accept membership-field filters? → A: Typed input — add `clubMembership: ClubMembershipFilterInput` argument with explicit, named fields (cleaner SDL, no JSONObject magic keys). The dollar-syntax and new-top-level-query options were rejected.
- Q: Should `active` (a virtual computed field) be filterable through the typed input? → A: No — exclude `active` from `ClubMembershipFilterInput`. Callers express the same intent via `start`/`end` operators, avoiding implicit "current time" coupling.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Frontend loads existing LOAN memberships for an enrollment season (Priority: P1)

The enrollment wizard, on entry to step 2, asks the backend for the players currently registered with a club whose membership is a LOAN that overlaps the enrollment season's date range. The wizard receives only those players (with their membership details), so it can hydrate the loans panel without a second round-trip and without any client-side filtering.

**Why this priority**: BAD-120 FR-011 cannot ship without this. Today the same query path either errors out or requires a workaround that inverts the join direction and complicates the wizard's hydration logic.

**Independent Test**: With a club that has known LOAN memberships overlapping a chosen season, request `Club.players` with a where clause filtering on membership type and overlapping start/end dates; assert the returned player list matches the expected memberships and only those.

**Acceptance Scenarios**:

1. **Given** a club with three LOAN memberships in 2025-2026 and one NORMAL membership, **When** the wizard requests the club's players filtered by `membershipType = LOAN` and date overlap with the 2025-2026 season window, **Then** exactly those three LOAN players are returned with their membership details.
2. **Given** a club with no LOAN memberships in the requested season, **When** the same filter is applied, **Then** an empty list is returned (no error).
3. **Given** the same query combined with a player-level filter (e.g. `firstName = "Anna"`), **When** the request runs, **Then** only players matching both the membership filter and the player-level filter are returned.

---

### User Story 2 — Existing flat filters keep working (Priority: P1)

Existing callers that already filter `Club.players` by player-level fields (e.g. autocomplete lookups, team-composition dialogs) continue to work without any change to their queries.

**Why this priority**: This change must not break production flows. The flat-filter shape is in active use across the codebase.

**Independent Test**: Run the existing `SearchClubPlayers` autocomplete query (or equivalent) before and after the change; assert identical results for at least three sample queries.

**Acceptance Scenarios**:

1. **Given** an existing query that filters players by `firstName` only, **When** the request runs after the change, **Then** results are identical to the pre-change behavior.
2. **Given** a query mixing flat player filters and the new membership filters, **When** the request runs, **Then** both filter groups apply (logical AND) without one overriding the other.

---

### User Story 3 — Predictable performance under load (Priority: P2)

A single request to filter players by membership fields produces a single SQL query, regardless of how many players are returned.

**Why this priority**: Without this guarantee, the new capability could mask an N+1 pattern that surfaces only on large clubs and is expensive to debug post-deploy.

**Independent Test**: Capture the SQL queries emitted by the resolver for a 1-player and a 50-player result set; assert the query count is the same (one per request).

**Acceptance Scenarios**:

1. **Given** a request that returns 50 players, **When** the request runs, **Then** the resolver emits one SQL query (one JOIN), not 51.
2. **Given** a request that returns zero players, **When** the request runs, **Then** the resolver still emits exactly one query.

---

### Edge Cases

- A `where` clause references a membership field on a member that does not exist on the membership entity — the system MUST return a clear error rather than silently ignoring the unknown key.
- A `where` clause uses an operator on a membership field that is not in the supported set (`$eq`, `$in`, `$lte`, `$gte`, plus any others already supported on flat fields) — system behavior MUST match how the same unsupported operator behaves on flat player fields (consistent error or no-op, but not a different shape).
- The membership filter matches zero players — empty list returned (already covered above; reinforces no error path).
- The membership filter matches all players in a club — full list returned with one query (no pagination collapse, no N+1).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `Club.players` MUST accept a typed `clubMembership` argument that filters returned players by fields on their club membership: `membershipType`, `start`, `end`, `confirmed`. The virtual `active` field is intentionally excluded — callers express the same intent via `start`/`end` operators.
- **FR-002**: The `clubMembership` filter MUST support at minimum these operators on its fields: equal, set membership (in), less-than-or-equal, greater-than-or-equal — matching the operator vocabulary already accepted on player-level fields.
- **FR-003**: The `clubMembership` filter MUST compose (logical AND) with the existing player-level `where` argument within the same query.
- **FR-004**: Filters MUST be applied via a database join, not by post-fetch client-side filtering.
- **FR-005**: A single resolver call MUST emit one SQL query regardless of result-row count (no N+1).
- **FR-006**: Existing callers that pass only the player-level `where` (no `clubMembership` argument) MUST continue to receive identical results to today.
- **FR-007**: The `clubMembership` input type MUST be exposed in the GraphQL schema with field-level descriptions so the frontend can author queries from introspection alone.

### Key Entities

- **Club**: Existing entity. Owns the `players` collection that this feature filters.
- **Player**: Existing entity. Returned by the filter; player-level fields remain filterable as today.
- **ClubPlayerMembership**: Existing entity. Provides the fields newly available in the typed filter input: `membershipType`, `start`, `end`, `confirmed`. The virtual `active` getter is not filterable through this input.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: BAD-120 frontend loads existing LOAN memberships for an enrollment season in a single request, with zero client-side filtering — verified by an end-to-end test in the frontend repo.
- **SC-002**: All three acceptance scenarios in User Story 1 pass against a real database with at least one club seeded with LOAN, NORMAL, and TRANSFER memberships across two seasons.
- **SC-003**: Zero regressions across existing `Club.players` callers — verified by running the affected backend test suite plus the frontend autocomplete smoke test.
- **SC-004**: Single SQL query emitted per resolver call regardless of result size — verified by query-log capture in test.

## Assumptions

- The frontend will adopt the typed `clubMembership` argument once it ships; until then, the workaround query path stays in place.
- The fields exposed for filtering match what already exists on the membership entity; no new columns or virtual fields are introduced as part of this change.
- Date-range overlap (start/end) is expressed by the caller using the same operators used elsewhere — no new "between" or "overlaps" operator is required for v1; FR-002 covers the operator set.
- Authorization on the player list is unchanged: callers who can already see a club's players today continue to see them; this feature does not add or remove visibility.

## Dependencies

- BAD-120: Frontend persistence work — this feature is a hard prerequisite for FR-011 (loan-loading on step 2 entry).
- BAD-131: Sibling backend issue (`addPlayerToClub` return type). Independent — can ship in either order.
