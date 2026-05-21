# Phase 0 Research — `dataloader` adoption

## R-001 — DataLoader semantics relevant to this refactor

**Decision**: Use `dataloader@^2.2.3` (current stable). Construct one `DataLoader<K, V>` per association, per request. Each constructor takes a single batch function of type `(keys: ReadonlyArray<K>) => Promise<ReadonlyArray<V | Error>>`.

**Key invariants (from the dataloader README)**:

1. The batch function MUST return an array whose `length === keys.length`.
2. The result array MUST be in the same order as the input keys.
3. Misses MUST be returned as `null` (or `undefined`) at the matching index — not omitted.
4. Throwing inside the batch function rejects every `.load(key)` Promise. Returning `Error` instances at specific indices lets a single batch partially fail.
5. DataLoader collects all `.load(key)` calls that happen synchronously and within the same microtask, then dispatches one batch.
6. DataLoader caches results by key inside the instance — second `.load(sameKey)` returns the cached Promise. The cache lives only as long as the instance.

**Rationale**: These invariants exactly match what the current `loadOne()` helper does manually (lines 70-99 of `team-association.service.ts`). Adopting DataLoader replaces ~30 lines of custom plumbing per association with one constructor call, without changing observable behaviour.

**Alternatives considered**:

- `@nestjs/graphql-dataloader` (third-party). Adds another transitive maintenance surface; provides decorators we don't need because NestJS request-scoped DI already covers the lifecycle. Rejected.
- Roll our own DataLoader-shaped helper inside the repo. Just moves the problem; loses the library's batched-error / cache-key-fn / max-batch-size features. Rejected.
- Apollo `context: ({ req }) => ({ loaders: makeLoaders() })` bag. Would require touching `grapqhl.module.ts` and changing how resolvers consume loaders (`@Context()` decorator). Rejected per user choice in plan-mode questioning: keep request-scoped NestJS provider pattern.

## R-002 — Lifecycle binding (request scoped vs Apollo context)

**Decision**: Keep `@Injectable({ scope: Scope.REQUEST })` on `TeamAssociationService`. Construct the DataLoaders in the constructor body (or as class field initialisers); NestJS instantiates a fresh service per GraphQL request, so each request gets fresh DataLoaders automatically.

**Rationale**:

- The codebase has no other Apollo-context plumbing — adding it now creates a new pattern with one consumer. Strictly worse than reusing the existing DI pattern.
- NestJS request-scoped DI has measurable per-request cost only when it cascades up the resolver tree. The current arrangement (singleton resolver injects request-scoped service) keeps the cascade contained to one service instance per request, identical to today's footprint.
- Tests already construct the service with `new TeamAssociationService()` and bypass DI entirely — that still works after the rewrite because field-initialised DataLoaders don't need DI.

**Alternatives considered**:

- Apollo context bag: rejected (R-001).
- Module-scoped singleton with internal `WeakMap<Request, DataLoader[]>`: needlessly complex; reintroduces the lifecycle bug class we are trying to delete.

## R-003 — Batch function design per association

**Decision**: Five DataLoaders, mirroring the existing five batch helpers:

| Loader | Key type | Value type | Batch query |
|--------|----------|------------|-------------|
| `captainLoader` | `string` (playerId) | `Player \| null` | `Player.findAll({ where: { id: { [Op.in]: ids } } })` |
| `locationLoader` | `string` (prefferedLocationId) | `Location \| null` | `Location.findAll({ where: { id: { [Op.in]: ids } } })` |
| `clubLoader` | `string` (clubId) | `Club \| null` | `Club.findAll({ where: { id: { [Op.in]: ids } } })` |
| `entryLoader` | `string` (teamId) | `EventEntry \| null` | `EventEntry.findAll({ where: { teamId: { [Op.in]: ids } } })` + group-by-teamId + drawId fallback |
| `playersLoader` | `string` (teamId) | `Player[]` | `TeamPlayerMembership.findAll({ where: { teamId: { [Op.in]: ids } }, include: [Player] })` + group-by-teamId + attach `player.TeamPlayerMembership` |

**Critical detail for `playersLoader`**: DataLoader's value type is `Player[]` (not `Player`). Returning an array of arrays is a valid use of DataLoader; per-key value is the team's full player list. `length === keys.length` still applies — missing teams get `[]`.

**Critical detail for `entryLoader`**: post-batch transformation preserves the [`team.resolver.ts:323`](libs/backend/graphql/src/resolvers/event/competition/team.resolver.ts) selection rule — prefer `drawId`-bearing entry; fall back to the first entry. Implemented inside the batch function before building the per-key result array.

**Rationale**: Direct port of the existing batch helpers. Same SQL shape, same grouping, same fallback rules. Risk of behaviour drift is minimal because the helpers are copied near-verbatim.

## R-004 — Test impact

**Decision**: Keep the existing seven test cases in [`team-association.service.spec.ts`](libs/backend/graphql/src/resolvers/team/team-association.service.spec.ts) unchanged in intent. Two minor mechanical adjustments expected:

1. The current test instantiates `new TeamAssociationService()` directly. After the rewrite, DataLoaders are constructed as field initialisers, so this still works without DI.
2. The "caches resolved ids so a second tick does not re-query" test relies on the internal cache. DataLoader's cache is per-instance, so the test passes by construction. No change.

The seven scenarios stay:

1. `getCaptain` batches across teams.
2. `getCaptain` returns null without querying when captainId missing.
3. `getCaptain` caches within a request.
4. `getClub` batches by clubId.
5. `getPrefferedLocation` batches.
6. `getEntry` batches + drawId fallback.
7. `getPlayers` batches + groups + attaches `TeamPlayerMembership`.

**Rationale**: Behavioural contract is unchanged; assertions should not need to change.

## R-005 — Rollback strategy

**Decision**: The migration is a single-file internal refactor. Rollback = revert the commit. No data migration, no flag, no two-phase deploy. Sentry watches `GetClubTeams` for 24h post-deploy per SC-004.

## R-006 — Dependency-check lint rule

**Open question (low-risk)**: The repo's `nx/dependency-checks` lint rule has 1 pre-existing error related to backend-graphql's `package.json` version specifiers. Adding `dataloader` may trigger the same class of error if version specifiers are misaligned with the installed version.

**Mitigation**: After `npm install dataloader`, run `npx nx lint backend-graphql` and ensure exact-version specifier in `package.json` matches the installed version (e.g. `"dataloader": "2.2.3"` not `"^2.2.3"` if the rule requires exact pinning). Pre-existing error count remains the baseline; no new errors permitted (per SC-003).
