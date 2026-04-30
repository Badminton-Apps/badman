# Feature Specification: Filter Club Players by Membership Fields

**Feature Branch**: `005-club-players-nested-where`
**Created**: 2026-04-30
**Status**: Draft (BAD-132 scope updated 2026-05-01 — see Clarifications)
**Linear**: [BAD-132](https://linear.app/dashdot/issue/BAD-132) — Priority: Urgent

## Clarifications

### Session 2026-04-30

- Q: How should the `Club.players` resolver accept membership-field filters? → A: Typed input — add `clubMembership: ClubMembershipFilterInput` argument with explicit, named fields. The dollar-syntax and new-top-level-query options were rejected.
- Q: Should `active` (a virtual computed field) be filterable through the typed input? → A: No — exclude `active` from `ClubMembershipFilterInput`.
- Q: BAD-132 scope update (2026-04-30) — fields are pre-typed (no operator maps), implicit `confirmed = true` is removed when the arg is supplied → A: Adopt typed SDL with `id: [ID!]`, `membershipType: [String!]`, `startBefore: DateTime`, `endAfter: DateTime`, `confirmed: Boolean`. When `clubMembership` arg is supplied (even as `{}`), the implicit `confirmed = true` filter is NOT applied. When the arg is omitted, today's behavior is preserved.
- Q: BAD-132 scope update (2026-05-01) — US2 changed from localStorage ID reconciliation to season-scoped transfer loading → A: US2 is now "load unconfirmed NORMAL (transfer) memberships for enrollment season" using `membershipType: ["NORMAL"], confirmed: false, startBefore, endAfter`. Step-3 SearchClubPlayers now explicitly passes `clubMembership: {}` to surface unconfirmed members.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Frontend loads existing LOAN memberships for an enrollment season (Priority: P1)

The enrollment wizard, on entry to step 2, asks the backend for the players whose membership is a LOAN that overlaps the enrollment season's date range, **including unconfirmed memberships**. The wizard receives only those players (with their membership details) and hydrates the loans panel without a second round-trip and without any client-side filtering.

**Why this priority**: BAD-120 FR-011 cannot ship without this. The frontend persists loans with `confirmed: false`; today's resolver silently filters them out.

**Independent Test**: With a club that has known LOAN memberships (some confirmed, some not) overlapping a chosen season, request `Club.players(clubMembership: { membershipType: ["LOAN"], startBefore: <seasonEnd>, endAfter: <seasonStart> })`; assert the returned list contains all matching memberships regardless of `confirmed`.

**Acceptance Scenarios**:

1. **Given** a club with three LOAN memberships in the 2025-2026 season (two confirmed, one unconfirmed), **When** the wizard requests `players(clubMembership: { membershipType: ["LOAN"], startBefore: "2026-04-30", endAfter: "2025-09-01" })`, **Then** all three LOAN players are returned.
2. **Given** a club with no LOAN memberships in the requested season, **When** the same filter is applied, **Then** an empty list is returned (no error).
3. **Given** the same query combined with a player-level `where: { firstName: { $eq: "Anna" } }`, **When** the request runs, **Then** only players matching both filters are returned.

---

### User Story 2 — Frontend loads unconfirmed NORMAL (transfer) memberships for an enrollment season (Priority: P1)

The enrollment wizard, on entry to step 2, asks the backend for players whose membership is a NORMAL type that is **unconfirmed** (i.e. a transfer added during this enrollment session) and overlaps the enrollment season's date range. The frontend uses `membershipType = NORMAL` + `confirmed = false` as the canonical "transfer added during this enrollment" indicator.

**Why this priority**: BAD-120 FR-007a / FR-011 cannot ship without this. Without filtering by `confirmed: false`, the frontend cannot distinguish transfers added in this session from long-standing confirmed members. Today's resolver silently strips all `confirmed: false` rows.

**Independent Test**: Request `Club.players(clubMembership: { membershipType: ["NORMAL"], confirmed: false, startBefore: <seasonEnd>, endAfter: <seasonStart> })`; assert only unconfirmed NORMAL memberships overlapping the season are returned.

**Acceptance Scenarios**:

1. **Given** a club with unconfirmed NORMAL memberships in the 2025-2026 season, **When** the wizard requests `players(clubMembership: { membershipType: ["NORMAL"], confirmed: false, startBefore: "2026-04-30", endAfter: "2025-09-01" })`, **Then** those unconfirmed NORMAL players are returned.
2. **Given** no unconfirmed NORMAL memberships exist in the season, **When** the same query runs, **Then** an empty list is returned (no error).
3. **Given** the same query, **When** the request runs, **Then** confirmed NORMAL members are NOT included in the result (the `confirmed: false` filter is exact match).

---

### User Story 3 — Existing callers stay unchanged (Priority: P1)

Callers that DO NOT pass the `clubMembership` argument (e.g. `SearchClubPlayers` autocomplete, team-composition dialog) continue to receive only confirmed memberships, exactly as today. The step-3 `SearchClubPlayers` query is updated to explicitly pass `clubMembership: {}` so it opts in to surfacing unconfirmed members in the team-composition dialog.

**Why this priority**: This change must be opt-in. Production flows already in active use must not change behavior.

**Independent Test**: Run the existing `SearchClubPlayers` query before and after the change; assert identical results.

**Acceptance Scenarios**:

1. **Given** an existing query `players(where: { firstName: { $eq: "Anna" } })` (no `clubMembership` arg), **When** the request runs after the change, **Then** results are identical to the pre-change behavior — unconfirmed memberships are still excluded.
2. **Given** any query that supplies `clubMembership: {}` (empty object), **When** the request runs, **Then** unconfirmed memberships ARE included (the empty arg signals "I am opting in to the new behavior").

---

### User Story 4 — Predictable performance under load (Priority: P2)

A single request to filter players by membership fields produces a single SQL query, regardless of how many players are returned.

**Why this priority**: Without this guarantee, the new capability could mask an N+1 pattern that surfaces only on large clubs and is expensive to debug post-deploy.

**Independent Test**: Capture the SQL queries emitted by the resolver for a 1-player and a 50-player result set; assert the query count is the same (one per request).

**Acceptance Scenarios**:

1. **Given** a request that returns 50 players, **When** the request runs, **Then** the resolver emits one SQL query (one INNER JOIN), not 51.
2. **Given** a request that returns zero players, **When** the request runs, **Then** the resolver still emits exactly one query.

---

### Edge Cases

- `clubMembership` arg supplied as `{}` (empty object) — the resolver opts into the new behavior: implicit `confirmed = true` is dropped, JOIN is `LEFT` (defensive) so members without a `clubMembership` row also surface.
- `clubMembership` arg supplied with `confirmed: false` — only unconfirmed memberships are returned. (Distinct from the `{}` case which includes both.)
- `clubMembership.id: []` (empty array) — caller intent is ambiguous (zero IDs); the resolver treats this as a no-match (returns empty list), not as "no filter" (which would be the `id` field omitted entirely).
- `startBefore` and `endAfter` together describe a date range overlap; either may be omitted to make the constraint one-sided.
- `clubMembership.membershipType: ["LOAN", "NORMAL"]` (multiple values) — translates to `IN ("LOAN", "NORMAL")`.
- `endAfter` excludes memberships where `end IS NULL` (open-ended memberships) — caller's responsibility to handle separately if needed.

## Requirements *(mandatory)*

### Functional Requirements

#### Filter input shape

- **FR-001**: `Club.players` MUST accept an optional typed argument `clubMembership: ClubMembershipFilterInput`. The argument MUST be additive — omitting it preserves today's behavior exactly.
- **FR-002**: `ClubMembershipFilterInput` MUST expose exactly these fields:
  - `id: [ID!]` — array of membership UUIDs; matches via SQL `IN`.
  - `membershipType: [String!]` — array of membership types (`NORMAL`, `LOAN`); matches via SQL `IN`.
  - `startBefore: DateTime` — translates to `ClubPlayerMembership.start <= startBefore`.
  - `endAfter: DateTime` — translates to `ClubPlayerMembership.end >= endAfter`.
  - `confirmed: Boolean` — exact match against `ClubPlayerMembership.confirmed`.
- **FR-003**: The virtual `active` field MUST NOT appear in the input.

#### Resolver behavior

- **FR-004**: When `clubMembership` is OMITTED, the resolver MUST behave exactly as today (implicit `confirmed = true` filter still applied via the existing `active`-derived path).
- **FR-005**: When `clubMembership` is SUPPLIED (even as `{}`), the resolver MUST NOT apply the implicit `confirmed = true` filter. Confirmed and unconfirmed memberships both surface unless the caller explicitly sets `confirmed: true`.
- **FR-006**: When `clubMembership` is supplied with `confirmed: <bool>`, the resolver MUST apply that exact-match filter (overrides the default-suppression rule for that one field).
- **FR-007**: The `clubMembership` filter MUST compose (logical AND) with the existing `where: JSONObject` argument on `Player`. Both filter groups apply within the same query.
- **FR-008**: Filters MUST be applied via a database JOIN (`INNER JOIN` when any field on `clubMembership` is set, `LEFT JOIN` when arg is `{}`), not by post-fetch client-side filtering.
- **FR-009**: A single resolver call MUST emit one SQL query regardless of result-row count (no N+1).

#### Schema documentation

- **FR-010**: `ClubMembershipFilterInput` MUST be exposed in the GraphQL schema with field-level descriptions explaining the operator semantics (`startBefore` → `<=`, `endAfter` → `>=`, etc.) so the frontend can author queries from introspection alone.

### Key Entities

- **Club**: Existing entity. Owns the `players` collection.
- **Player**: Existing entity. Returned by the filter; player-level filtering via the existing `where` arg unchanged.
- **ClubPlayerMembership**: Existing entity. Provides the fields newly filterable via the typed input: `id`, `membershipType`, `start` (via `startBefore`), `end` (via `endAfter`), `confirmed`.
- **ClubMembershipFilterInput**: NEW GraphQL input type defined by FR-002.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: BAD-120 frontend loads existing LOAN memberships (incl. unconfirmed) for an enrollment season in a single request, with zero client-side filtering — verified by end-to-end test in the frontend repo.
- **SC-002**: BAD-120 frontend loads unconfirmed NORMAL (transfer) memberships for an enrollment season in a single request using `confirmed: false` — verified by end-to-end test in the frontend repo.
- **SC-003**: Existing `SearchClubPlayers` autocomplete (and any other caller without `clubMembership` arg) returns identical results before and after the change — zero regressions on the implicit-confirmed-filter behavior.
- **SC-004**: Single SQL query emitted per resolver call regardless of result size — verified by query-log capture in test.
- **SC-005**: Probe verification — a club with known unconfirmed memberships (e.g. clubId `4699bcdd-f6db-48ea-81aa-f79acdf47a7c` per BAD-132 references) returns those unconfirmed rows when called with `clubMembership: {}` and continues to exclude them when called without the arg.

## Assumptions

- The frontend lands its `.gql` mutation/query updates and codegen regen in the same coordinated PR window as the backend SDL change.
- No `season: Int` field is added to `ClubPlayerMembership`; date-range queries use `startBefore`/`endAfter` derived from `getSeasonPeriod(season)` on the frontend side.
- Authorization on the player list is unchanged: callers who can already see a club's players today continue to see them; this feature does not add or remove visibility.
- Sequelize `BelongsToMany` association from `Club` → `Player` via `ClubPlayerMembership` is the existing path; no association rewiring needed.
- `endAfter` excludes NULL `end` (open-ended memberships); the frontend accepts this exclusion or handles it with a second query.

## Dependencies

- BAD-120: Frontend persistence work — this feature is a hard prerequisite for FR-007a, FR-011 (loan/transfer hydration on step 2/3 entry, including unconfirmed rows).
- BAD-131: Sibling backend issue (`addPlayerToClub` return type). Independent — can ship in either order.
