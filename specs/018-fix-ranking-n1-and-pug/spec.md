# Feature Specification: Fix RankingSystem N+1 queries and clubenrollment pug syntax error

**Feature Branch**: `018-fix-ranking-n1-and-pug`
**Created**: 2026-05-18
**Status**: Draft
**Input**: User description: "Fix Sentry production issues — pug template syntax error in clubenrollment email + N+1 queries against ranking.RankingSystems table during PlayerEncounterCompetitions and GetClubPlayers GraphQL operations. Introduce a cached RankingSystem accessor used by Game, RankingPlace, and RankingLastPlace resolvers; remove optional-chaining (`?.`) from pug templates that the pug 3.0.3 lexer rejects."

## Clarifications

### Session 2026-05-18

- Q: How should `RankingSystemService` expose cache effectiveness for verification of SC-001 / SC-002? → A: Nest `Logger.debug` on miss and on `invalidate()` only; no logging on hit; no metrics endpoint. Matches the existing repo logger pattern (`notifier.base.ts`, `notification.service.ts`). Hit-rate is observable in dev/staging by setting `LOG_LEVEL=debug`. Post-deploy verification in production relies on Sentry no longer flagging the N+1 alerts plus the APM response-time drop in SC-006.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Player can open competition history without redundant queries (Priority: P1)

A player visits their personal competition history page (the page powered by the `PlayerEncounterCompetitions` GraphQL operation). Today, for a player with many encounters, the API issues one redundant `RankingSystems` lookup per game, multiplying database round trips and slowing the response. The user perceives this as a slow page and Sentry records the N+1 alert.

**Why this priority**: Customer-facing performance regression; visible in Sentry with high event volume; affects every player viewing competition history.

**Independent Test**: Run `PlayerEncounterCompetitions` against a player with ≥20 encounters in a staging environment with Sequelize query logging enabled. Confirm the `SELECT … FROM "ranking"."RankingSystems" WHERE "primary" = true` query executes exactly once per HTTP request, regardless of how many games are returned.

**Acceptance Scenarios**:

1. **Given** a player with 50+ games across 10+ encounters, **When** the frontend issues the `PlayerEncounterCompetitions` query requesting games and their players, **Then** the backend executes at most one `RankingSystems` query for the primary system during that request.
2. **Given** Sentry is configured to detect repeated identical SQL in a single transaction, **When** the deployed fix is live for 24 hours, **Then** no new N+1 events fire under transaction `POST /graphql (query PlayerEncounterCompetitions)`.

---

### User Story 2 — Club admin can list players without N+1 alerts (Priority: P1)

A club administrator opens the player-search / club-players page (the page powered by the `GetClubPlayers` GraphQL operation). Today, each player's `RankingLastPlace` field triggers a separate `RankingSystems WHERE id IN (…)` lookup. For a large club this fires dozens of identical queries.

**Why this priority**: Equivalent customer impact to Story 1 on a separate hot path; same root entity (`RankingSystem`) and therefore shares the fix.

**Independent Test**: Run `GetClubPlayers` against a club with ≥30 members in staging with Sequelize logging enabled. Confirm only one `RankingSystems WHERE id = …` query fires per unique system id, regardless of member count.

**Acceptance Scenarios**:

1. **Given** a club with 30+ active player memberships, **When** the frontend issues the `GetClubPlayers` query requesting players with their last ranking, **Then** the backend executes at most one `RankingSystems` query per unique ranking-system id referenced in the response.
2. **Given** Sentry is monitoring the `GetClubPlayers` operation, **When** the fix is deployed, **Then** the existing N+1 issue (119703170) receives no new events.

---

### User Story 3 — Club admin receives the enrollment confirmation email (Priority: P1)

A club administrator submits a club enrollment for the upcoming season. The backend renders the `clubenrollment` email template and sends it to the registered email address. Today, rendering throws `Syntax Error: Unexpected token` at the lexer stage because the template uses `?.` optional chaining inside pug conditional expressions, which pug 3.0.3 does not parse. The email is never sent and the failure surfaces as an unhandled rejection in production.

**Why this priority**: Customer-facing functional outage of a transactional email; small fix, high visibility.

**Independent Test**: Trigger the club-enrollment confirmation flow against a staging environment using a club with at least one team that has an entry, one team without an entry, and one team without a captain. The email must render successfully in all three cases and reach the recipient.

**Acceptance Scenarios**:

1. **Given** a club submits enrollment with teams that each have a complete `entry.subEventCompetition.eventCompetition.name`, **When** the backend renders the template, **Then** rendering succeeds and the "Afdeling" line shows the competition and sub-event names.
2. **Given** a team is enrolled without a chosen division, **When** the template renders, **Then** the "Geen afdeling gekozen" fallback is shown (no rendering error).
3. **Given** a team's `entry` is null or `entry.meta` is missing, **When** the template renders, **Then** the "Basisspelers" section renders with an empty list and no exception is thrown.

---

### Edge Cases

- The primary `RankingSystem` row is updated by an administrator while the API is running (e.g. changing `amountOfLevels`). The cached value must refresh within a bounded time so admins do not see stale data indefinitely.
- The primary `RankingSystem` row is missing entirely (fresh database, mis-seeded environment). The system must surface a clear, non-cascading error rather than tens of repeated lookups.
- A `RankingPlace` references a non-existent `systemId` (orphan data). The accessor must handle the miss without poisoning the cache for valid ids.
- A pug template uses `?.` somewhere we have not catalogued yet (other email templates). Rendering must not regress for those flows; a sweep covers all `*.pug` files in scope.
- The cached accessor is used inside a Sequelize transaction (read after write). The accessor must not return pre-transaction stale data when called from a path that has just mutated the row.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST expose a single cached accessor for the primary `RankingSystem` row, so that a single GraphQL request resolves it at most once regardless of how many resolvers ask for it.
- **FR-002**: System MUST expose a single cached accessor for any `RankingSystem` by id, so that repeated lookups of the same id within a short time window do not re-query the database.
- **FR-003**: System MUST replace the in-resolver `RankingSystem.findOne({ where: { primary: true } })` call in the `Game.players` field resolver with the cached primary accessor.
- **FR-004**: System MUST replace the per-row `getRankingSystem()` association call in the `RankingPlace.rankingSystem` field resolver with the cached by-id accessor.
- **FR-005**: System MUST replace the per-row `getRankingSystem()` association call in the `RankingLastPlace.rankingSystem` field resolver with the cached by-id accessor.
- **FR-006**: System MUST replace the in-loop `RankingSystem.findByPk(...)` calls inside the `rankingPlaces` query handler with the cached by-id accessor.
- **FR-007**: System MUST invalidate the cached values after any mutation that creates, updates, or deletes a `RankingSystem` row, so administrators do not see stale data after their own changes.
- **FR-008**: System MUST allow cached entries to expire after a bounded time window so that out-of-band database changes (manual SQL, migrations, other services) are picked up without restart. The bounded window must not exceed five minutes.
- **FR-009**: System MUST render the `clubenrollment` email template successfully for all combinations of team `entry`, `captain`, and `meta.competition.players` being present or absent, without using JS optional-chaining inside the template.
- **FR-010**: System MUST verify, by template sweep, that no other pug template under the mailing library relies on `?.` inside conditional or `each` expressions; any found MUST be converted to explicit null-guard chains.
- **FR-011**: System MUST preserve all existing rendered HTML output of the `clubenrollment` template when the underlying data is well-formed (i.e. the fix is structural only).
- **FR-012**: System MUST keep observable response shapes of `PlayerEncounterCompetitions` and `GetClubPlayers` unchanged; consumers of the GraphQL schema MUST NOT need to migrate.
- **FR-013**: The cached accessor MUST emit a `Logger.debug` entry on every cache miss (one per `getPrimary` miss; one per `getById(id)` miss including the id) and on every `invalidate()` call. Cache hits MUST NOT log to avoid production noise. No metrics endpoint, counter, or hit-ratio API is in scope.

### Key Entities *(include if feature involves data)*

- **RankingSystem**: federation-level ranking configuration row (single-digit cardinality org-wide). Has a boolean `primary` flag identifying the active system. Read by many resolvers, mutated rarely by administrators. Caching it is safe within a short TTL.
- **RankingPlace / RankingLastPlace**: per-player ranking records that reference a `RankingSystem` by `systemId`. Their `rankingSystem` field is requested by clients on hot paths.
- **Game (with GamePlayerMembership)**: encounter game with per-player ranking snapshots; needs the primary `RankingSystem` only to fill in default levels when a membership's `single`/`double`/`mix` is null.
- **Clubenrollment email template**: pug template rendered server-side after a club submits its enrollment, summarising teams, locations and comments.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After deploy, the count of `RankingSystems` rows fetched per `PlayerEncounterCompetitions` request drops from `O(games)` to exactly 1 (verified in Sequelize logs against a player with ≥20 encounters).
- **SC-002**: After deploy, the count of `RankingSystems` rows fetched per `GetClubPlayers` request drops from `O(players)` to at most 1 per unique system id (verified in Sequelize logs against a club with ≥30 members).
- **SC-003**: The two N+1 Sentry issues (119703170 and 119737606) receive zero new events in the 24 hours following deploy.
- **SC-004**: The pug `Syntax Error: Unexpected token` Sentry issue (119679018) receives zero new events in the 24 hours following deploy.
- **SC-005**: Club enrollment confirmation emails are delivered for 100% of successful enrollment submissions in the first week after deploy (versus 0% today due to the pug error).
- **SC-006**: Average end-to-end response time of `PlayerEncounterCompetitions` for the slowest 10% of users drops by at least 20% (measured over a one-week window before vs after deploy).

## Assumptions

- The `primary` `RankingSystem` row changes at most a handful of times per year, so a five-minute in-process TTL is acceptable and will not be observed by end users.
- The deployment runs a small, fixed number of API instances; per-instance in-memory caching is sufficient and a shared cache (Redis) is not required for correctness.
- Administrative mutations on `RankingSystem` go through the existing `rankingSystem` GraphQL resolver, which is the only mutation surface in scope for cache invalidation.
- No existing GraphQL client depends on the (current) accidental property that each `RankingSystem` read returns a fresh Sequelize model instance; cached returns of the same instance are acceptable.
- The `clubenrollment` template is rendered at runtime by `CompileService.toHtml()`; there is no precompilation step that would need a separate fix.
- Other pug templates that use `?.` (if any are found) can be transformed with the same explicit null-guard pattern without changing their rendered output.
- N+1 detection in Sentry is reliable enough that the absence of new events in the 24 hours after deploy is a sufficient acceptance signal.

## Out of Scope

- Introducing a request-scoped DataLoader infrastructure across the GraphQL layer. The fix is targeted at the specific N+1 sites identified by Sentry; other `RankingSystem` fetch sites listed in the codebase (`rankingPoint.resolver.ts`, competition/tournament `subevent.resolver.ts` and `event.resolver.ts`, `assembly.resolver.ts`, `encounter.resolver.ts`, `draw.resolver.ts`, `player.resolver.ts`, `calculation.service.ts`) are NOT migrated as part of this feature, though they may opt in later as a follow-up.
- Redesigning the club-enrollment email contents or layout. The pug fix is strictly structural.
- Upgrading the pug library to a version that supports optional chaining. The fix removes the unsupported syntax instead.
- Adding Redis or any cross-process cache for `RankingSystem`. In-process caching is sufficient given current cardinality and traffic patterns.
