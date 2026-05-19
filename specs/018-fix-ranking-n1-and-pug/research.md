# Phase 0 Research — Fix RankingSystem N+1 + clubenrollment pug

**Branch**: `018-fix-ranking-n1-and-pug` | **Date**: 2026-05-18

No `[NEEDS CLARIFICATION]` markers remained after `/speckit.specify`. The research below records the load-bearing technical decisions, alternatives considered, and the codebase facts that justify them.

---

## R1. Caching strategy for `RankingSystem` lookups

**Decision**: In-process `@Injectable()` `RankingSystemService` with two memoized accessors and a TTL ≤ 5 minutes. Explicit `invalidate()` called by the `RankingSystem` mutation resolver after commit.

**Rationale**:
- Cardinality: `ranking.RankingSystems` has single-digit rows org-wide; the cache is bounded by definition.
- Write rate: mutations on this table happen rarely (admin operations a handful of times per year). A short TTL bounds staleness from out-of-band changes (manual SQL, migrations, peer instances) without observable user impact.
- Multi-instance correctness: Render runs a small fixed number of API instances. Each instance can carry its own cached snapshot; the 5-minute TTL guarantees convergence after admin mutations propagate.
- Existing service lives in the same lib (`libs/backend/ranking`) and follows the same module shape as `PointsService` / `CalculationService` / `PlaceService` — no new conventions.

**Alternatives considered**:
- **Request-scoped DataLoader**: would batch lookups per request but adds infrastructure (`GraphQLContext`, dataloader factories) and gives no cross-request benefit. Overkill for a tiny, near-static table. Listed as out-of-scope in the spec.
- **Redis-backed cache**: gives cross-instance consistency but is a heavier dependency for negligible benefit at this cardinality.
- **Eager `include` on parent queries**: would solve `RankingPlace.rankingSystem` but doesn't help `Game.players` (the lookup is conditional on a `null` field) and requires touching every call site.
- **No-TTL forever cache + `invalidate()` only**: brittle — any non-resolver write (migration, manual SQL, sibling instance) leaves the cache stale until restart.

---

## R2. Cache invalidation hooks

**Decision**: Call `rankingSystemService.invalidate()` immediately after the transaction `commit()` inside each existing `RankingSystem` mutation in `libs/backend/graphql/src/resolvers/ranking/rankingSystem.resolver.ts`.

**Rationale**:
- Mutation list (grep on `@Mutation` against `=> RankingSystem`): 6 mutations at lines 84, 136, 212, 252, 292, 371, and 1 `=> Boolean` at line 420 (likely a delete). All target the same table; all need invalidation.
- Invalidating *after* commit avoids the case where a rollback leaves the cache empty while the row is unchanged (acceptable but wasteful) — the more important guarantee is that the cache never holds a value that was committed-but-doesn't-exist.
- Centralizing the call in the resolver (vs. a Sequelize hook on the model) keeps the dependency arrow pointing the right way: `graphql → ranking` already exists; reversing it would require `database → ranking`, which it isn't.

**Alternatives considered**:
- **Sequelize `afterCreate` / `afterUpdate` / `afterDestroy` hooks on the model**: cleaner in isolation, but the model is defined in `@badman/backend-database` which does not depend on `@badman/backend-ranking`. Forces a circular or DI-detour.
- **Skipping invalidation, relying on TTL only**: violates Spec FR-007 (admins must not see their own stale data).

---

## R3. TTL value

**Decision**: 5 minutes (300_000 ms), constant in the service file.

**Rationale**:
- Spec FR-008 caps it at 5 min.
- 5 min is long enough that the per-request hit rate is near 100% for hot operations (`PlayerEncounterCompetitions` p95 well under 5s; subsequent requests reuse), and short enough that an admin who mutated through another instance won't sit confused.

**Alternatives considered**: shorter values (1 min) reduce cache effectiveness on bursty workloads without meaningfully improving correctness. Longer values violate the spec.

---

## R4. Pug optional-chaining replacement

**Decision**: Replace `team?.entry?.x` (and similar `team.entry?.meta?.x`) with explicit `&&` chains. Single file affected: `libs/backend/mailing/src/compile/templates/clubenrollment/html.pug`, lines 33 and 46.

**Rationale**:
- Pug version pinned at `^3.0.3` (`package.json`). Its lexer uses an old `acorn` that does not accept `?.` inside `if`/`each` expressions. The lexer error is the exact one in Sentry (`Syntax Error: Unexpected token`).
- Grep across all pug templates under `libs/backend/mailing/src/compile/templates/` returns exactly one file containing `?.`. So the sweep finishes in one file (Spec FR-010 satisfied at zero additional cost).
- Frontend impact: none. Pug render is invoked via `notifierEnrollment.notify(...)` at `notification.service.ts:501` *without* `await`. The mutation at `entry.resolver.ts:158` already wraps notification dispatch in try/catch and only logs. The Sentry mechanism `auto.node.onunhandledrejection` confirms the rejection escapes the fire-and-forget path; the mutation itself returns `{ success: true, notificationDispatched: false }`. So the *user-observable* impact is silent email loss, not a frontend error (matches Spec User Story 3).

**Alternatives considered**:
- **Upgrade pug** to a version that supports `?.`: out-of-scope per spec; bigger change, more risk.
- **Move the null-guard into the renderer (`CompileService.toHtml`)**: would solve this site but not future templates; the canonical fix is to stop using unsupported syntax in templates.

---

## R5. Module wiring

**Decision**:
- `RankingSystemService` is added to `RankingModule.providers` and `RankingModule.exports` (`libs/backend/ranking/src/ranking.module.ts`).
- `RankingResolverModule` (graphql) already imports `RankingModule` — no change needed there.
- `GameResolverModule` (`libs/backend/graphql/src/resolvers/game/game.module.ts`) currently imports `[DatabaseModule, QueueModule]` only. Add `RankingModule` to its imports so `GamesResolver` can inject the new service.

**Rationale**: minimal, follows the existing module-per-domain pattern. No circular imports (verified: `RankingModule` imports `DatabaseModule` + `QueueModule`; it does not import GraphQL).

**Alternatives considered**: providing the service globally via `@Global()` — rejected because the existing convention is explicit imports per module and `RankingModule` is not currently global.

---

## R6. Test strategy

**Decision**:
- Unit test the service in isolation (`ranking-system.service.spec.ts`): cache hit / miss / TTL expiry (use fake timers) / invalidate clears both maps / underlying `RankingSystem.findOne` and `RankingSystem.findByPk` mocked with `jest.spyOn`.
- Update resolver specs to inject a mock service and assert it is called instead of model statics. Follows Constitution Principle IV (no real DB, `Test.createTestingModule`, `afterEach(jest.restoreAllMocks)`).
- For the pug template: add a render fixture test in the mailing lib if one does not already exist for `clubenrollment`; otherwise rely on a manual quickstart verification step. To be confirmed when reading `libs/backend/mailing` test structure.

**Rationale**: matches existing repo patterns; gives high confidence with zero infrastructure cost.

**Alternatives considered**: an integration test against a seeded DB for the resolver path — rejected as redundant given the unit coverage and the Sentry verification on real production traffic.

---

## R7. Risk register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| TTL hides admin change for up to 5 min on a *different* instance | Medium | Low | `invalidate()` clears local cache immediately; cross-instance stale is bounded and acceptable. Documented in Spec Assumptions. |
| Cached model instance is mutated by caller, polluting future reads | Low | Medium | Service returns the same `RankingSystem` model instance from cache. Callers in the affected resolvers only read attributes (`amountOfLevels`, `maxDiffLevels`) — no mutation. Documented in Spec Assumptions. If this becomes a concern, freeze or clone in a follow-up. |
| Pug template re-introduces `?.` in a future PR | Medium | Low (we'd see it in Sentry again) | Out of scope to add a lint rule today; note in tech-debt registry as a follow-up. |
| Another N+1 resurfaces under a different operation name | Medium | Low | Spec Out-of-Scope explicitly lists other `RankingSystem.findOne` sites; service is reusable for follow-up tasks (one-line swap). |

---

## R8. Out-of-band facts captured during exploration

- `Game.players` ResolveField: [libs/backend/graphql/src/resolvers/game/game.resolver.ts:84-132](../../../libs/backend/graphql/src/resolvers/game/game.resolver.ts) (specifically lines 102–107 fetch the primary system per Game).
- `RankingPlace.rankingSystem`: [libs/backend/graphql/src/resolvers/ranking/rankingPlace.resolver.ts:67-70](../../../libs/backend/graphql/src/resolvers/ranking/rankingPlace.resolver.ts), plus in-loop `findByPk` at lines 31 and 52.
- `RankingLastPlace.rankingSystem`: [libs/backend/graphql/src/resolvers/ranking/lastRankingPlace.resolver.ts:42-45](../../../libs/backend/graphql/src/resolvers/ranking/lastRankingPlace.resolver.ts) (no constructor currently — needs one added).
- `RankingSystem` mutations: 7 entries (6 `=> RankingSystem`, 1 `=> Boolean` delete) inside `rankingSystem.resolver.ts`. Each must call `invalidate()` after commit.
- Sentry issue IDs: 119703170 (GetClubPlayers N+1), 119737606 (PlayerEncounterCompetitions N+1), 119679018 (pug syntax error).
- Sentry mechanism on the pug issue: `auto.node.onunhandledrejection`, `handled: no` — confirms the render is fire-and-forget downstream of `entry.resolver.ts:158`'s try/catch.
