# Phase 0 — Research

All unknowns from the Technical Context have been resolved. The feature spec was clarified once (page-size constants, session 2026-05-19) and no `NEEDS CLARIFICATION` markers remain. The research entries below capture the load-bearing decisions and the alternatives considered.

## 1. Batching primitive for `Player → RankingLastPlace[]`

- **Decision**: Use the `dataloader@2.x` package wrapped by a request-scoped NestJS `@Injectable({ scope: Scope.REQUEST })` service named `PlayerAssociationService`, mirroring `TeamAssociationService` at [libs/backend/graphql/src/resolvers/team/team-association.service.ts](../../libs/backend/graphql/src/resolvers/team/team-association.service.ts).
- **Rationale**:
  - `dataloader` is already a runtime dependency (added by PR #923 / spec 019). No new package required.
  - The request-scoped DI pattern is proven and documented in this codebase; reviewers already know the lifecycle invariants. Matches Constitution Principle I/IV expectations for "established repository pattern".
  - One microtask-batched dispatch per request maps `playerId[]` to `RankingLastPlace[]` in a single `findAll` with `[Op.in]` + `systemId = primary.id`, hitting the composite index `lastPlaces_ranking_index` on `(playerId, systemId)`.
- **Alternatives considered**:
  - **Sequelize `include` eager-load** on the parent `Player.findAndCountAll`: rejected because `rankingLastPlaces` is a `@ResolveField`, so the parent query has no awareness of whether the field was selected; eager-loading unconditionally would penalise queries that don't ask for ranking. Spec 021 (assembly) accepts that trade-off because that path always reads ranking; the `players` query does not.
  - **A bespoke microtask batcher** (the pre-#923 pattern): rejected for the reasons spec 019 captured — extra LoC, no observable behaviour gain, harder for new engineers to audit.
  - **Apollo `@graphql/dataloader` plus per-request context plumbing** in `apps/api`: rejected because the `TeamAssociationService` approach already establishes request-scoped DI as the lifecycle binding (spec 019 FR-007). Introducing Apollo context plumbing for a single field is excess complexity.

## 2. Server-side bounds on the `players` query

- **Decision**: Enforce `default take = 25, max take = 200` directly inside the `players` resolver, after `ListArgs.toFindOptions(listArgs)`. Use two module-private constants (`PLAYERS_DEFAULT_TAKE`, `PLAYERS_MAX_TAKE`). Do NOT generalise to `ListArgs.toFindOptions`.
- **Rationale**:
  - The `players` query is the documented hot path (SC-001..004 are scoped to it). Other paged endpoints in the repo do not exhibit the same pathology and have varying UX expectations (admin grids vs. autocomplete pickers).
  - Generalising in `ListArgs` would silently change the behaviour of every paged endpoint and require a sweeping audit; that is risky and out of scope for a stabilisation fix.
  - The chosen constants (25 / 200) match clarifications session 2026-05-19 and the typical Apollo picker UX (one screen of autocomplete + headroom for power users).
- **Alternatives considered**:
  - **No default, only max**: rejected because the bug reproducer omits `take` entirely; without a default an unbounded query still hits the database (the only thing stopping the crash would be the row limit clamping inside `findAndCountAll`, which doesn't help when `LIMIT NULL` is what ships).
  - **Reject queries without `take`**: rejected because at least one in-tree caller (the legacy SPA player picker) historically called with no `take` and a small-enough `where`; rejecting would break it. Capping is sufficient.
  - **Lower max (e.g. 100)**: rejected per clarification — admin lists occasionally ask for a larger page, and 200 rows × 1 batched `ranking_last_places` query is still cheap (composite-index lookup with ≤200 ids).

## 3. Where the primary `RankingSystem` lookup lives

- **Decision**: Call `RankingSystemService.getPrimary()` **once inside the batch function**, before issuing the `ranking_last_places` SELECT. Do not call it in the resolver body.
- **Rationale**:
  - `RankingSystemService` already memoises with a 5-minute TTL and dedups in-flight callers (see [libs/backend/ranking/src/services/system/ranking-system.service.ts](../../libs/backend/ranking/src/services/system/ranking-system.service.ts)). Calling it once per request — inside the batch fn — is the cheapest correct location.
  - Resolver no longer needs to await the primary system before delegating to the loader; the loader awaits it before the SQL. This keeps the resolver body trivially small.
- **Alternatives considered**:
  - **Lazy-load lazily inside `getPrimaryRankingLastPlaces`**: rejected because the loader's batch fn is precisely the place that already runs once per request — duplicating the await elsewhere is redundant.
  - **Add a `RankingSystem` DataLoader**: rejected for this feature. Spec 020 (#933) already covers per-request `RankingSystemService` dedup as its own feature; introducing it inside 027 would conflate scopes.

## 4. Preserving the `getRankingProtected` redaction

- **Decision**: Run `getRankingProtected(place, system)` in the resolver, NOT in the loader. The loader returns raw `RankingLastPlace` rows.
- **Rationale**:
  - Redaction is permission-gated and pertains to the current request's user. Keeping it in the resolver leaves the loader pure ("batch fetch by key, return rows") and preserves the existing `loadSystemsByIds` helper unchanged.
  - The number of `(place, system)` decoration calls is bounded by `≤ PLAYERS_MAX_TAKE × 1 system = 200`, which is trivial CPU.
- **Alternatives considered**:
  - **Decorate inside the loader**: rejected — couples the loader to the request user and makes the helper untestable without a `Player` fixture with permissions.

## 5. Test strategy

- **Decision**: Two test files. (a) Extend `player.resolver.spec.ts` with three cases: cap default, cap max, loader delegation. (b) Add new `player-association.service.spec.ts` that mocks `RankingSystemService.getPrimary` + `RankingLastPlace.findAll` and asserts: one `findAll` call per batch, grouped by `playerId`, empty-array fallback per FR-011, dedup per FR-010.
- **Rationale**: Follows Constitution Principle IV — `Test.createTestingModule`, `jest.spyOn` on model statics, no real DB, `afterEach(jest.restoreAllMocks)`. Co-located beside source per the rule.
- **Alternatives considered**:
  - **Integration test against a real Postgres**: rejected — slow, flaky, and the behaviour under test (call counts) is straightforward to verify with spies.

## Resolved unknowns checklist

- [x] Batching primitive (DataLoader 2.x, request-scoped)
- [x] Constants for `players` cap (25 / 200, codified in FR-001..003 / SC-004)
- [x] Where the primary-system lookup runs (inside loader batch fn)
- [x] Whether redaction stays in the resolver (yes)
- [x] Test layout (co-located, mocked statics, no real DB)
- [x] No GraphQL schema change required (FR-013)
- [x] No frontend coordination required (FR-014)
