# Quickstart — Reproduce and verify the SearchPlayer fix

This is the end-to-end recipe for an engineer picking up the implementation tasks (or doing a final review). Follow top to bottom; each section is self-contained.

## Prerequisites

- Repo checked out on branch `027-fix-search-player-n1` (already the case after `/speckit.specify`).
- `npm install` complete; `dataloader` already present in root `package.json` (added by PR #923).
- Local Postgres + Redis running: `npm run docker:up`.
- Seed data present (the failing search needs a populated `players` table): `npm run seed:test-data` if your local DB is empty.

## 1. Reproduce the crash (pre-fix, optional)

Useful only as a sanity check before implementing. Skip if you already know the bug.

```bash
# Boot the API
nx run api:serve

# In another shell, replay the failing query verbatim:
curl -s http://localhost:5010/graphql \
  -H 'content-type: application/json' \
  -d '{"operationName":"SearchPlayer","variables":{"systemId":"684f355c-cfcf-463b-8cc3-931cfed6417c","where":{"$and":[{"$or":[{"firstName":{"$iLike":"%pe%"}},{"lastName":{"$iLike":"%pe%"}},{"memberId":{"$iLike":"%pe%"}}]}]}},"query":"query SearchPlayer($systemId: ID!, $where: JSONObject) { players(where: $where) { count rows { id fullName firstName lastName memberId gender rankingLastPlaces(where: {systemId: $systemId}) { id single double mix } } } }"}' \
  | head -c 500
```

Pre-fix: the API process either exhausts the DB pool, OOMs, or returns 502. Post-fix: ≤200 rows of JSON in <1 s.

## 2. Implementation order (mirrors `tasks.md` once generated)

1. **Add `PlayerAssociationService`** at [libs/backend/graphql/src/resolvers/player/player-association.service.ts](../../libs/backend/graphql/src/resolvers/player/player-association.service.ts).
   - Annotate `@Injectable({ scope: Scope.REQUEST })`.
   - Inject `RankingSystemService`.
   - One `DataLoader<string, RankingLastPlace[]>` keyed by `playerId`.
   - Batch fn does: `getPrimary()` → if null return `keys.map(() => [])`; else one `RankingLastPlace.findAll({ where: { playerId: { [Op.in]: keys }, systemId: primary.id }, order: [["rankingDate","DESC"]] })`; group; return in key order.
2. **Register the service** in `libs/backend/graphql/src/grapqhl.module.ts` alongside `TeamAssociationService`.
3. **Edit `player.resolver.ts`**:
   - Add module-private `PLAYERS_DEFAULT_TAKE = 25`, `PLAYERS_MAX_TAKE = 200`.
   - In the `players` resolver, after `ListArgs.toFindOptions(listArgs)`, clamp: `options.limit = Math.min(options.limit ?? PLAYERS_DEFAULT_TAKE, PLAYERS_MAX_TAKE)`.
   - Inject `PlayerAssociationService`.
   - Rewrite `rankingLastPlaces`: drop the per-call `rankingSystemService.getPrimary()` and `player.getRankingLastPlaces(...)`; call `await this.playerAssociations.getPrimaryRankingLastPlaces(player)`; keep the existing `loadSystemsByIds` + `getRankingProtected` decoration step.
   - Keep `listArgs` arg on the field signature for schema compatibility; ignore client-supplied `where.systemId` overrides (current behaviour).
4. **Write tests**:
   - `player-association.service.spec.ts` (new) — see Constitution Principle IV reference pattern.
   - `player.resolver.spec.ts` (extend) — three new cases:
     - `players` invoked without `take` → `findAndCountAll` called with `limit: 25`.
     - `players` invoked with `take: 5000` → `findAndCountAll` called with `limit: 200`.
     - `rankingLastPlaces` resolver delegates to `playerAssociations.getPrimaryRankingLastPlaces(player)` exactly once and returns the protected rows.

## 3. Verification

### a. Unit tests

```bash
nx test backend-graphql
# Or directly:
npx jest --config libs/backend/graphql/jest.config.ts \
  libs/backend/graphql/src/resolvers/player/
```

Expect zero failures, zero new warnings. Existing `team-association.service.spec.ts` MUST continue to pass without modification.

### b. Lint + format

```bash
nx lint backend-graphql
prettier --check libs/backend/graphql/src/resolvers/player/
```

### c. End-to-end replay

```bash
nx run api:serve   # boot the API with Sequelize logging
# In another shell, replay the curl from step 1 above.
```

Verify in the API log:

- Exactly one `SELECT ... FROM "ranking"."ranking_last_places" WHERE "playerId" IN (...) AND "systemId" = ...` per request.
- Zero `SELECT ... FROM "ranking"."ranking_systems" WHERE "primary" = true ...` when the `RankingSystemService` cache is warm (≤1 when cold).
- HTTP 200, response body has `rows.length ≤ 200`, response time < 1 s on the dev dataset (SC-001).

### d. Pagination contract

Drive the resolver with `take: 5000` and `take: 0` to confirm:

- `take: 5000` → 200 rows, `count` still equals the true total.
- `take: 0` → GraphQL validation error from the existing `@Min(1)` decorator (no new validation needed).

### e. Cross-resolver dedup smoke

Issue a query that requests `rankingLastPlaces` on the same player twice via different selection paths (e.g. directly under `players.rows` and again via a nested team membership). Confirm the `ranking_last_places` SELECT still fires exactly once.

## 4. Roll-back plan

The change is contained in three files. To revert: drop both `player-association.service.*` files, undo the two-line cap in `player.resolver.ts`, undo the field-resolver delegation, remove the provider registration in `grapqhl.module.ts`. No migration, no schema, no FE coordination — instant rollback.

## 5. Out-of-band follow-ups (not in this feature)

- `Player.rankingPlaces` (history field) shows the same per-player pattern and would benefit from the same treatment. Spec 019's future-opt-in table already lists it; pick up when Sentry or product motivates.
- Consider adding the new entry to spec 019's catalogue as a documentation-only commit, so future readers find it via the same index.
