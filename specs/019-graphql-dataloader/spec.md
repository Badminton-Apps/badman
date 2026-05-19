# Feature Specification: Adopt DataLoader for GraphQL N+1 batching

**Feature Branch**: `019-graphql-dataloader`
**Created**: 2026-05-19
**Status**: Draft
**Input**: User description: "Replace the custom microtask-debounced batching in `TeamAssociationService` with the industry-standard `dataloader` package, keeping the same public API and request-scoped lifecycle. Catalogue other resolver paths that could become DataLoaders later, but defer their migration."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Backend engineer can review team field-resolver batching with one well-known abstraction (Priority: P1)

A backend engineer joins the team or returns to the `team-association.service.ts` file months after PR #920 was merged. Today they have to read ~150 lines of custom `Batch<K, V>` / `BatchState<K, V>` plumbing — microtask scheduling, inflight-promise management, manual key dedup — before they can reason about whether a tweak is safe. After this change, the file is roughly fifty lines of straightforward `DataLoader` instances whose semantics are documented at https://github.com/graphql/dataloader and used in every other GraphQL backend they have worked on. The engineer can land changes confidently without re-deriving the batching invariants.

**Why this priority**: Maintainability and onboarding cost. The custom code has the same observable behaviour as `DataLoader` but is far easier to get wrong (lifecycle bugs, off-by-one batches, type narrowing) and harder to audit. This is the only user-visible story this feature offers.

**Independent Test**: Open `team-association.service.ts` after the change; verify the file contains no custom `Batch` / `BatchState` types, only `DataLoader` instances and their batch functions. Run the existing `team-association.service.spec.ts` suite — assertions on call counts, group-by-team behaviour, drawId-fallback for `EventEntry`, and the `player.TeamPlayerMembership` attachment must still pass.

**Acceptance Scenarios**:

1. **Given** a `GetClubTeams` GraphQL request returning a club with ten teams asking `teams { players { id } captain { id } locations { id } club { id } entry { id } }`, **When** the resolver tree executes, **Then** the backend issues exactly five association queries — one `findAll` per association — regardless of team count, matching the post-#920 baseline.
2. **Given** the same request is replayed within one second, **When** the resolver tree executes again, **Then** a new `DataLoader` instance is created (request-scoped), the same five queries fire (no cross-request cache), and no global state leaks between requests.
3. **Given** a request asking for `Team.entry` against teams whose `EventEntry` rows include a mix of `drawId`-bearing and `drawId=NULL` rows, **When** the loader resolves, **Then** the result for each team prefers the `drawId`-bearing entry and falls back to the first available entry — identical to the behaviour at `team.resolver.ts:323` before PR #920.
4. **Given** a request asking for `Team.players`, **When** the loader resolves, **Then** each returned `Player` has `player.TeamPlayerMembership` attached so downstream resolvers (e.g. `PlayerTeamResolver.teamMembership`) keep working.

---

### Edge Cases

- A `Team.captainId` / `prefferedLocationId` / `clubId` is null. The resolver returns `null` without dispatching a batch entry.
- The same id is requested by two parents in the same tick. `DataLoader.load(id)` dedups the call — the batch fn sees the id once.
- A batch fn returns fewer rows than ids requested (some ids resolve to no row). The fn maps each input id to either the row or `null`, in input order, satisfying `DataLoader`'s contract.
- A request errors mid-flight (DB connection drop). The error propagates through every `.load()` caller for that batch; subsequent ticks start fresh batches.
- A non-GraphQL caller imports `TeamAssociationService` directly (currently none). The request-scoped DI annotation prevents instantiation outside a request context — same as today.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST replace the internal `Batch<K, V>` / `BatchState<K, V>` types and the `loadOne()` helper in `TeamAssociationService` with `DataLoader` instances supplied by the `dataloader` npm package.
- **FR-002**: System MUST preserve the public method signatures of `TeamAssociationService` (`getCaptain`, `getPrefferedLocation`, `getClub`, `getEntry`, `getPlayers`) so that no resolver call site changes.
- **FR-003**: System MUST keep `TeamAssociationService` registered as `@Injectable({ scope: Scope.REQUEST })` so each GraphQL request gets a fresh batching context and no caches leak between requests.
- **FR-004**: System MUST preserve the `EventEntry` selection rule for `getEntry` — prefer the entry with a populated `drawId`, fall back to the first available entry for the team.
- **FR-005**: System MUST preserve the `player.TeamPlayerMembership` attachment performed by `getPlayers`, so that `PlayerTeamResolver.teamMembership` and other consumers continue to read the membership row off the player.
- **FR-006**: System MUST add `dataloader` to the runtime `dependencies` in the root `package.json`; no additional `@types` package is required.
- **FR-007**: System MUST NOT introduce a runtime dependency on Apollo context plumbing — the existing NestJS request-scoped DI is the sole lifecycle binding.
- **FR-008**: System MUST NOT change `team.resolver.ts`, `team.module.ts`, or `grapqhl.module.ts` beyond compile-time-required type adjustments. The migration is internal to `team-association.service.ts`.
- **FR-009**: Existing unit tests in `team-association.service.spec.ts` MUST continue to pass without weakening their assertions (call counts, grouping behaviour, fallback rules, membership attachment).

### Key Entities

- **TeamAssociationService**: Request-scoped batching helper used by `TeamsResolver`. Owns five DataLoader instances after migration, one per association (`captain` → `Player`, `locations` → `Location`, `club` → `Club`, `entry` → `EventEntry`, `players` → `Player[]`).
- **DataLoader**: External library providing per-key dedup and microtask-batched dispatch. Constructed per request, constructor receives a batch function `(keys: readonly K[]) => Promise<(V | null)[]>` whose result MUST match the input order and length.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Number of association queries issued during a `GetClubTeams` request asking captain + locations + club + entry + players against a ≥10-team club is exactly five — the same baseline established by PR #920 in production.
- **SC-002**: `team-association.service.ts` line count drops by at least 40 lines after the migration (current ≈170 lines; target ≤130).
- **SC-003**: Zero new lint warnings, zero new test failures, zero new TypeScript errors introduced relative to the `fix/club-players-teams-n1` baseline.
- **SC-004**: Zero new Sentry N+1 events on `POST /graphql (query GetClubTeams)` in the 24 hours following deploy.
- **SC-005**: No call site outside `team-association.service.ts` requires modification (verified by `git diff --name-only` against the merge base showing only the service file, its spec, and `package.json`).

## Assumptions

- The `dataloader` package (version 2.x) is acceptable as a new runtime dependency. The package is single-purpose, has no transitive dependencies, and is the de-facto standard in the GraphQL ecosystem.
- The existing test suite at `team-association.service.spec.ts` is sufficient to detect regressions in microtask batching, per-key dedup, group-by-team behaviour, the drawId-fallback for `EventEntry`, and the `player.TeamPlayerMembership` attachment.
- The post-PR-#920 Sentry baseline (zero new N+1 events on `GetClubTeams`) is stable enough to detect a regression from this refactor within 24 hours of deploy.
- `RankingSystemService` (5-min TTL, module-scoped) and its REST consumer (`ranking.controller.ts`) stay untouched in this feature. Future-opt-in candidates are tracked in this spec but not delivered here.

## Future Opt-In Candidates (Out of Scope for this feature)

The following sites would also benefit from DataLoader-style batching. Each becomes a separate, smaller feature when a Sentry signal or hot-path manual test motivates it. Listed here only so they are not forgotten.

| Site | File reference | Why DataLoader would help |
|------|----------------|---------------------------|
| `RankingSystemService.getById` | [`libs/backend/ranking/src/services/system/ranking-system.service.ts`](libs/backend/ranking/src/services/system/ranking-system.service.ts) | Add a thin request-scoped DataLoader that calls the cached service inside its batch fn — keeps 5-min TTL cross-request cache, gains per-request id dedup for queries returning many `rankingPlaces` sharing one systemId. Eighteen resolver consumers. |
| `Player.getCurrentRanking` per-player loop | [`libs/backend/graphql/src/resolvers/event/competition/assembly.resolver.ts:51,79`](libs/backend/graphql/src/resolvers/event/competition/assembly.resolver.ts) | One association query per player today. Batch by `playerId` into a single `RankingLastPlace.findAll`. |
| `RankingPoint.player` field resolver | [`libs/backend/graphql/src/resolvers/ranking/rankingPoint.resolver.ts:42`](libs/backend/graphql/src/resolvers/ranking/rankingPoint.resolver.ts) | One `getPlayer()` per row. Batch by `playerId` across the rankingPoints list. |
| `RankingLastPlace.player` field resolver | [`libs/backend/graphql/src/resolvers/ranking/lastRankingPlace.resolver.ts:55`](libs/backend/graphql/src/resolvers/ranking/lastRankingPlace.resolver.ts) | Same pattern as above. |
| `EncounterCompetition.home` / `.away` / `.drawCompetition` | `encounter.resolver.ts` | Per-encounter `getHome()` / `getAway()` / `getDrawCompetition()` — batch Teams + DrawCompetitions referenced across an encounters list. |
| `SubEvent.eventCompetition`, `DrawCompetition.subEventCompetition`, `EventEntry.subEventCompetition` | competition + tournament resolvers | Per-row association lookups; batch by parent FK. |
| `Comment.player` | wherever `Comment` is exposed in the schema | One `findByPk` per comment; batch by `playerId`. |

Pre-condition for any opt-in: each site needs either a confirmed Sentry N+1 alert or a documented hot-path manual test result. Avoid speculative batching of cold paths.
