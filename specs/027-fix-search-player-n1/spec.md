# Feature Specification: Stabilise SearchPlayer under broad search terms

**Feature Branch**: `027-fix-search-player-n1`
**Created**: 2026-05-19
**Status**: Draft
**Input**: User description: "Cap players query and add PlayerAssociationService DataLoader to batch Player.rankingLastPlaces"

## Clarifications

### Session 2026-05-19

- Q: Page size constants for the `players` query (default + hard maximum)? → A: default `take = 25`, max `take = 200`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Users searching for players by a short text fragment get results instead of an outage (Priority: P1)

A signed-in user opens the player picker in the new frontend and starts typing a player's name, member id, or club number. With as little as two characters the frontend issues a `SearchPlayer` GraphQL query that asks for `players(where: { ... iLike "%xx%" ... }) { count, rows { id, fullName, …, rankingLastPlaces(where: { systemId: $systemId }) { single, double, mix } } }`. Today this query brings the API down: the unbounded result set returns thousands of `Player` rows, and the nested `rankingLastPlaces` field fires one SQL statement per row, exhausting the database connection pool.

After this change the same query returns within a normal interactive response budget, never returns more than a fixed maximum number of rows, and the nested ranking field issues one batched lookup regardless of how many players matched. The picker continues to work for short fragments — but it now gracefully presents the top page of matches plus the total count, rather than crashing the API for every connected user.

**Why this priority**: This is the only user story. The bug is a production-impact incident — a single short-search keystroke can take down the read API for everyone. There is no v2 here; restoring the query is the entire feature.

**Independent Test**: From a clean dev environment, run the exact failing payload (verbatim from the bug report) against `nx run api:serve`. Assert that the HTTP response succeeds, returns at most the configured maximum number of rows, contains a `count` field reflecting the true total match count, and that the server log shows exactly one `SELECT … FROM ranking_last_places WHERE playerId IN (…) AND systemId = …` for the request — never one per returned player.

**Acceptance Scenarios**:

1. **Given** a `SearchPlayer` request whose `where` matches >1000 player rows and which does NOT include a `take` argument, **When** the resolver executes, **Then** the response includes at most the server-side default page size of player rows, `count` reflects the true total number of matches across the database, and the API process remains healthy for subsequent requests.
2. **Given** the same `SearchPlayer` request with `take: 5000` supplied by the client, **When** the resolver executes, **Then** the response includes at most the server-side hard maximum of player rows and the same `count` semantics, ignoring the oversized client value.
3. **Given** a `SearchPlayer` request returning `N` players with the `rankingLastPlaces(where: { systemId: $systemId })` selection set, **When** the resolver tree executes, **Then** the backend issues exactly one query to `ranking_last_places` for the whole request, and every returned player carries the correct `rankingLastPlaces` array for that system (matching the value the legacy per-player query would have produced).
4. **Given** the same `SearchPlayer` request replayed within the same second on a separate HTTP request, **When** the second resolver tree executes, **Then** a new batching context is used (no cross-request cache) and the same one batched `ranking_last_places` query fires.
5. **Given** a `SearchPlayer` request whose `where` matches zero players, **When** the resolver executes, **Then** the response returns `count: 0`, `rows: []`, and no query to `ranking_last_places` is issued.
6. **Given** a `SearchPlayer` request whose `where` matches `K` players all having no rows in `ranking_last_places` for the primary system, **When** the resolver tree executes, **Then** each player carries `rankingLastPlaces: []` and the single batched query returns no rows.

---

### Edge Cases

- **Client explicitly passes `take: 0`**: behaviour matches today's class-validator rule (`@Min(1)`) — the GraphQL layer rejects the value at input validation. No new handling required.
- **Client passes `skip` larger than `count`**: returns `rows: []` with truthful `count`. No change in behaviour.
- **Primary ranking system is missing or has been deleted**: every player's `rankingLastPlaces` resolves to `[]`. The batch helper returns empty arrays for all keys without issuing a `ranking_last_places` query, mirroring how `rankingSystemService.getPrimary()` returning null is handled elsewhere.
- **A second resolver in the same request also asks for `rankingLastPlaces` on the same player(s)** (e.g. nested through teams): the request-scoped batcher dedupes by `playerId`, so the second access does not issue a second query.
- **A request errors mid-flight (DB connection drop)** during the batched `ranking_last_places` lookup: the error propagates to every player's `rankingLastPlaces` field for that request; subsequent requests start fresh.
- **`Player.rankingPlaces` (history) is requested in the same query**: out of scope. The existing per-player implementation remains; only `rankingLastPlaces` is migrated.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The `players` GraphQL query MUST cap the number of rows it returns to a server-side hard maximum of 200, regardless of the client-supplied `take` value or its absence.
- **FR-002**: When the client omits `take`, the `players` query MUST apply a server-side default page size of 25.
- **FR-003**: When the client supplies a `take` value greater than 200, the resolver MUST clamp the effective limit to 200 without erroring. The query MUST still succeed.
- **FR-004**: The `count` field on the `PagedPlayer` response MUST continue to report the true total number of matching rows (independent of the applied limit), so the frontend can render accurate "showing N of M" UI.
- **FR-005**: The `players` query MUST continue to honour the existing `getPlayerFilters()` constraints (`memberId` present, non-empty, and not `iLike '%unknown%'`).
- **FR-006**: The `Player.rankingLastPlaces` field resolver MUST issue at most one database query per request to `ranking_last_places`, regardless of how many `Player` parents are present in the response.
- **FR-007**: The `Player.rankingLastPlaces` resolver MUST continue to restrict results to the primary `RankingSystem`, matching the current behaviour where any client-supplied `systemId` is overridden by the server-resolved primary.
- **FR-008**: The `Player.rankingLastPlaces` resolver MUST continue to return values produced by `getRankingProtected(place, system)` so permission-gated columns remain redacted.
- **FR-009**: The new batching helper MUST be request-scoped, so that no `Player → RankingLastPlace` mapping is shared across HTTP requests.
- **FR-010**: When the same `playerId` appears more than once in the same request (e.g. via separate parent objects), the batching helper MUST issue the lookup for that id only once.
- **FR-011**: The batching helper MUST return `[]` for every player when the primary ranking system cannot be resolved (e.g. no row marked primary), without issuing a query to `ranking_last_places`.
- **FR-012**: The implementation MUST follow the existing repository pattern for request-scoped GraphQL batching (the same shape as `TeamAssociationService`), so on-call engineers reading the new code recognise it without additional onboarding.
- **FR-013**: No changes are required to the GraphQL schema. The `players` query and the `Player.rankingLastPlaces` field MUST keep their existing argument shape (`take`, `skip`, `where`) and return type, so existing clients continue to work without modification.
- **FR-014**: The frontend in the separate repository does not require coordinated changes for this fix to take effect. Once the API is deployed, the existing `SearchPlayer` query MUST succeed against the capped, batched implementation.

### Key Entities

- **Player**: Existing Sequelize / GraphQL entity. Result rows of the `players` query. No model change.
- **RankingLastPlace**: Existing Sequelize / GraphQL entity. One row per `(playerId, systemId)`. Queried via the composite `lastPlaces_ranking_index`. No model change.
- **RankingSystem (primary)**: Existing entity. Resolved once per request via the already-memoised `RankingSystemService.getPrimary()` accessor. No model change.
- **PlayerAssociationService** (new): Request-scoped GraphQL helper that owns one batching loader keyed by `playerId`, returning the `RankingLastPlace[]` for the primary system per player. Mirrors `TeamAssociationService`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Replaying the bug-report payload (verbatim, 2-letter `iLike` pattern, no `take`) against the API returns `200 OK` in under 1 second on a representative dev dataset, where today it crashes the process.
- **SC-002**: Across a `SearchPlayer` request with the maximum allowed number of returned players selecting `rankingLastPlaces`, the count of `SELECT … FROM ranking_last_places …` statements per request is exactly 1.
- **SC-003**: Across the same request, the count of `SELECT … FROM ranking_systems WHERE primary = true …` statements per request is at most 1, and is 0 when `RankingSystemService.getPrimary()` is warm.
- **SC-004**: The number of `Player` rows returned by any single `players` query never exceeds 200, verified by an automated test driving the resolver with `take = 5000`.
- **SC-005**: Zero new Sentry N+1 alerts on `POST /graphql (operationName: SearchPlayer)` in the 24 hours following deploy.
- **SC-006**: No regressions in existing `player.resolver.spec.ts` or `team-association.service.spec.ts` suites.

## Assumptions

- The repository's existing batching pattern (`TeamAssociationService`, request-scoped DI, `dataloader@2.x`) is the right primitive. The `dataloader` runtime dependency is already installed via PR #923; this feature reuses it without adding new dependencies.
- `RankingSystemService.getPrimary()` and `getById()` (PR #920) are the correct primitives for resolving the primary system and decorating loaded rows. They already memoise with a 5-minute TTL; this spec does not change their behaviour.
- The composite index `lastPlaces_ranking_index` on `(playerId, systemId)` is adequate for the new `WHERE playerId IN (...) AND systemId = ?` access pattern (single index scan per request). No new index is required.
- Server-side default page size of 25 and hard maximum of 200 are committed (see Clarifications session 2026-05-19; codified in FR-001 / FR-002 / FR-003 / SC-004). The constants are intentionally localised so they remain easy to tune if product analytics later motivate a change.
- This feature does NOT alter the schema, the GraphQL contract, the legacy Angular frontend (which is unused in the live flow), or the new Next.js frontend in the separate repository.
- The non-`Last` `Player.rankingPlaces` field resolver (ranking history) is out of scope. It is not selected by the crashing query and migrating it is a separate, signal-driven follow-up tracked in spec 019's future-opt-in catalogue.
