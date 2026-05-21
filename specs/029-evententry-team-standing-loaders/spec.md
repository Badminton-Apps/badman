# Feature Specification: EventEntry Team & Standing DataLoader Batching

**Feature Branch**: `029-evententry-team-standing-loaders`
**Created**: 2026-05-21
**Status**: Draft
**Input**: User description: "Fix N+1 in EventEntry team and standing field resolvers via DataLoaders"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Club teams page loads without per-entry round-trips (Priority: P1)

A club admin or visitor opens a club page that lists every team in the current season together with each team's competition entries, the team's name and its current standing in the competition table. Today the page issues one database round-trip per entry to fetch its team row and one more to fetch its standing row, so a club with N entries triggers ~2N extra queries. The user perceives this as a noticeably slower load, and the backend logs and APM repeatedly flag the request as an N+1.

**Why this priority**: This is the only user journey covered by this feature. It directly removes a production performance regression already reported in Sentry against the live `GetClubTeams` GraphQL operation and reduces backend cost.

**Independent Test**: Resolve the `GetClubTeams` GraphQL operation (or any GraphQL operation that selects `team` and/or `standing` on a list of `EventEntry`s) for a club with at least three teams. Confirm the API returns the same data as before and that database telemetry shows a single batched `Team` query and a single batched `Standing` query for the entire list instead of one per entry.

**Acceptance Scenarios**:

1. **Given** a club with N entries that each have a team and a standing, **When** a single GraphQL request selects `team { id name }` and `standing { id position }` on those entries, **Then** the backend issues exactly one batched `Team` lookup and one batched `Standing` lookup for the whole request, regardless of N.
2. **Given** a request that also selects `enrollmentValidation` (which internally needs the same `team`) on those entries, **When** the request is resolved, **Then** `enrollmentValidation` reuses the already-batched team data and does not issue any additional per-entry team lookups.
3. **Given** an entry whose `teamId` is missing or refers to a deleted team, **When** the resolver loads its `team`, **Then** the field resolves to `null` (matching today's behavior for a missing association) without throwing or breaking sibling entries' batched results.
4. **Given** an entry that has no standing row, **When** the resolver loads its `standing`, **Then** the field resolves to `null` without throwing or breaking sibling entries' batched results.
5. **Given** two parallel GraphQL requests resolving the same operation for the same club, **When** both complete, **Then** each request batches independently and no cached team or standing leaks across the two request boundaries.

### Edge Cases

- An entry's `teamId` is `null` or points to a row that no longer exists — the `team` field returns `null` for that entry and other entries are unaffected.
- An entry has zero or multiple standing rows historically — the resolver returns a single standing row consistent with the previous `getStanding()` behavior, or `null` if none exist.
- The same team or standing appears on multiple entries in the same request — it is fetched and serialized once.
- A failure inside the batched database call rejects every caller in that batch with the same error, mirroring how a per-row failure surfaces today.
- The GraphQL operation selects only `id` or other scalar fields on `EventEntry` and does not select `team` or `standing` — no team or standing query runs at all (today's behavior is preserved).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The `team` field on `EventEntry` MUST be resolvable in batch: any number of `team` lookups originating from the same GraphQL request MUST be collapsed into a single database read.
- **FR-002**: The `standing` field on `EventEntry` MUST be resolvable in batch: any number of `standing` lookups originating from the same GraphQL request MUST be collapsed into a single database read keyed on the entry identifier.
- **FR-003**: Any other server-side code path inside the same GraphQL request that needs the team of an `EventEntry` (notably `enrollmentValidation`) MUST reuse the same batched team data instead of issuing its own per-entry team query.
- **FR-004**: When a requested team or standing does not exist, the corresponding field MUST resolve to `null` and MUST NOT cause the rest of the batch to fail.
- **FR-005**: Batched data MUST NOT be shared between distinct GraphQL requests; each request MUST start with an empty batching cache so stale or cross-tenant rows can never leak.
- **FR-006**: The publicly observable GraphQL response shape and field values for `team`, `standing` and `enrollmentValidation` MUST be unchanged versus the previous per-entry implementation.
- **FR-007**: Existing automated tests covering the affected resolvers MUST continue to pass; new automated tests MUST assert the batching behavior so the N+1 cannot silently regress.

### Key Entities *(include if feature involves data)*

- **EventEntry**: Represents one team's participation in one sub-event for one season. Carries the foreign key to its `Team` and is the parent identifier for its `Standing`.
- **Team**: Carries identity and descriptive data (name, abbreviation, etc.) for a club's competitive team. Loaded by primary key per entry today; will be loaded in batch by primary key going forward.
- **Standing**: Represents an entry's current row in the competition table (position, points, games won/lost). Owned by an `EventEntry` via its `entryId`. Loaded one row at a time today; will be loaded in batch keyed by `entryId`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For any GraphQL request that selects `team` and/or `standing` on a list of `EventEntry`s, the number of `Team`-table reads MUST be at most 1 and the number of `Standing`-table reads MUST be at most 1, regardless of how many entries are returned.
- **SC-002**: Sentry issue 121423071 ("N+1 Query" on `POST /graphql (query GetClubTeams)`, alternating `Standings WHERE entryId = ...` and `Teams WHERE id = ...`) MUST stop firing in production after the change is deployed.
- **SC-003**: The end-to-end response payload of the `GetClubTeams` operation MUST be equivalent (modulo ordering rules that already exist today) to the response produced before the change for the same input.
- **SC-004**: The server-side wall-clock duration of a representative `GetClubTeams` request against a club with 10+ entries SHOULD drop by at least the time of `2 × (N − 1)` saved database round-trips compared with the pre-change baseline.

## Assumptions

- A request-scoped batching mechanism is acceptable; cross-request caching of team or standing data is explicitly out of scope.
- The Sentry trace accurately reflects the dominant remaining N+1 on this operation. Other `EventEntry` field resolvers (`players`, `drawCompetition`, `drawTournament`, `subEventTournament`) are not reported by Sentry and are not part of this feature; they may be addressed in a follow-up.
- The unrelated permissions N+1 on the same operation has already been addressed by the prior caching change to `Player.getPermissions()` and is not in scope here.
- The `Standing` of an `EventEntry` continues to be modeled as effectively 1:1 by `entryId`; if multiple historical rows exist, the resolver MUST return a single row consistent with the previous `getStanding()` semantics.
- Existing GraphQL clients of these fields tolerate `null` returns for missing associations (this matches current behavior).
