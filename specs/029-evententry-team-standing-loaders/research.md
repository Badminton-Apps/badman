# Phase 0 Research — EventEntry Team & Standing Loaders

All `Technical Context` items resolved. No outstanding `NEEDS CLARIFICATION`.

## R1. Existing DataLoader pattern in this codebase

- **Decision**: Reuse the pattern established in [libs/backend/graphql/src/loaders/team-loader.service.ts](../../libs/backend/graphql/src/loaders/team-loader.service.ts) — `@Injectable({ scope: Scope.REQUEST })`, a private `DataLoader<K, V | null>`, a `load(id)` method that short-circuits on falsy ids, and a `batch*` method that issues a single `Model.findAll({ where: { <key>: { [Op.in]: [...ids] } } })` and maps results back to the input ids array.
- **Rationale**: Three sibling loaders already follow this shape (`team-loader.service.ts`, `sub-event-competition-loader.service.ts`, `player-loader.service.ts`). Consistency makes review trivial and the `Scope.REQUEST` lifecycle guarantees per-request isolation (spec FR-005).
- **Alternatives considered**: (a) Eager `include` on a higher-level query — rejected: would require changing every `EventEntry` caller. (b) Apollo response-cache — rejected: wrong layer, doesn't fix the per-request cost. (c) Manual prefetch in the parent resolver — rejected: leaks per-field concerns into parents.

## R2. Keying strategy for the new `StandingLoaderService`

- **Decision**: Key by `entryId`. Implementation: `Standing.findAll({ where: { entryId: { [Op.in]: [...ids] } } })`, then build `new Map(rows.map(r => [r.entryId, r]))`. For ids with no matching row, return `null`.
- **Rationale**: `Standing` is associated to `EventEntry` via `@HasOne(() => Standing)` on `EventEntry` ([entry.model.ts:171](../../libs/backend/database/src/models/event/entry.model.ts#L171)) with FK `Standing.entryId` ([standing.model.ts:41-47](../../libs/backend/database/src/models/event/standing.model.ts#L41-L47)). Existing per-row code calls `eventEntry.getStanding()`, which resolves the same FK; keying by `entryId` reproduces the semantics exactly.
- **Edge case (multiple rows)**: If duplicate `entryId` rows exist (data anomaly), the `Map` overwrite preserves the last row from the batched read. Matches today's effectively 1:1 `getStanding()` contract (Sequelize `HasOne` returns a single row); spec assumption acknowledges this.

## R3. Wiring the loaders into the resolver's module

- **Decision**: Register `TeamLoaderService` and `StandingLoaderService` as providers in [event.module.ts](../../libs/backend/graphql/src/resolvers/event/event.module.ts) (alongside the already-registered `SubEventCompetitionLoaderService`). Inject both into `EventEntryResolver`'s constructor.
- **Rationale**: `Scope.REQUEST` providers must be in the module that hosts their consumer. `TeamLoaderService` is also registered in `CompetitionResolverModule`; re-registering it here is safe — request-scoped instances are per-injection-context, and we want fresh batching per request anyway. No accidental sharing because there is no singleton.
- **Alternatives considered**: Creating a dedicated `LoadersModule` with all loaders — out of scope; defer to a future refactor when more loaders are wired into more modules.

## R4. `Team` lookup key for `EventEntry.team`

- **Decision**: Call `this.teamLoader.load(eventEntry.teamId)` instead of `eventEntry.getTeam()`. The `teamId` foreign key is already present on the `EventEntry` row returned by the parent query (confirmed by Sentry preceding span on issue 121405520, which shows `EventEntry.teamId IN (...)` is already loaded eagerly upstream).
- **Rationale**: We already have the FK in hand — no extra round-trip to discover it. Returning `null` when `teamId` is falsy matches today's behavior.

## R5. `enrollmentValidation` reuse

- **Decision**: Replace the `await eventEntry.getTeam()` at [entry.resolver.ts:93](../../libs/backend/graphql/src/resolvers/event/entry.resolver.ts#L93) with `await this.teamLoader.load(eventEntry.teamId)` so it joins the same per-request batch as `team()`.
- **Rationale**: Spec FR-003. Without this, requests that select both `team` and `enrollmentValidation` would still issue per-entry team lookups for the second path. DataLoader caches by id within the request, so the additional call is free after the first.

## R6. Test strategy

- **Decision**: Extend [entry.resolver.dataloader.spec.ts](../../libs/backend/graphql/src/resolvers/event/entry.resolver.dataloader.spec.ts) with two new `describe` blocks: `team batching` and `standing batching`. Each constructs N fake `EventEntry` parents, resolves the field on all of them concurrently with `Promise.all`, and asserts that `Team.findAll` / `Standing.findAll` was called exactly once with `Op.in` covering all ids. Reuses the existing fake-Sequelize / `jest.spyOn` machinery — no real DB.
- **Rationale**: Mirrors the `subEventCompetition` batching test already in the same file. Satisfies Principle IV (resolver test discipline) without adding any new test infrastructure.

## R7. Out of scope (explicit, to prevent scope creep)

- `players`, `drawCompetition`, `drawTournament`, `subEventTournament` field resolvers on `EventEntry` are still per-row but **not** part of this feature — not reported in Sentry, deferred to follow-up.
- Generalizing into a `LoadersModule` — deferred.
- The unrelated permissions N+1 already fixed by PR #949 — out of scope.
