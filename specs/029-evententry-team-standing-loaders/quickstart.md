# Quickstart — Verify the EventEntry team/standing loaders

Time: ~10 minutes. Assumes you can run the API locally.

## 1. Start dependencies + API

```bash
npm run docker:up                                  # Postgres, Redis, pgAdmin
nx run-many --target=serve --projects=api,worker-sync --parallel
```

API serves GraphQL at `http://localhost:5010/graphql`.

## 2. Seed (if needed)

```bash
npm run seed:test-data
```

Pick (or create) a club with at least 3 teams that each have an `EventEntry` with a `Standing`.

## 3. Run the unit tests

```bash
nx test backend-graphql --testPathPattern=entry.resolver.dataloader.spec
```

Expected: existing `subEventCompetition batching` test still green; new `team batching` and `standing batching` tests green; each asserts exactly one underlying `findAll` per field per request.

## 4. Run the operation against a real DB

Use Apollo sandbox or any GraphQL client against `http://localhost:5010/graphql` with the production-shaped operation:

```graphql
query GetClubTeams($clubId: ID!, $season: Int!) {
  club(id: $clubId) {
    id
    teams(where: { season: $season }) {
      id
      name
      entries {
        id
        team { id name abbreviation }
        standing { id position points }
      }
    }
  }
}
```

## 5. Observe SQL

Enable Sequelize query logging (env var `LOG_LEVEL=debug` or whatever the project already uses; check `apps/api` startup config). Run the query above.

**Before the change** — alternating per entry:

```sql
SELECT ... FROM event."Standings" WHERE "entryId" = '...' LIMIT 1;
SELECT ... FROM public."Teams" WHERE id = '...';
SELECT ... FROM event."Standings" WHERE "entryId" = '...' LIMIT 1;
SELECT ... FROM public."Teams" WHERE id = '...';
...
```

**After the change**:

```sql
SELECT ... FROM public."Teams"     WHERE id      IN ('...', '...', '...');
SELECT ... FROM event."Standings"  WHERE "entryId" IN ('...', '...', '...');
```

Exactly one of each, regardless of entry count.

## 6. Cross-check the response

Diff the JSON response against a recorded baseline from `develop`. Bytes-for-bytes equality (modulo existing ordering) confirms SC-003.

## 7. Production confirmation (post-deploy)

- Watch Sentry issue **121423071** — it must stop firing on the next release.
- Apollo Studio trace for `GetClubTeams` should show two batched DB spans for `Team` and `Standing` instead of `2 × N` spans.

## Troubleshooting

- **Loader returns `null` for a valid id**: confirm the parent query selected the foreign key (`teamId` for `EventEntry.team`, `id` for `EventEntry.standing`). Without the FK the resolver passes `undefined` and gets `null` by design.
- **Still seeing per-row queries**: verify `TeamLoaderService` and `StandingLoaderService` are both listed in the `providers:` of [event.module.ts](../../libs/backend/graphql/src/resolvers/event/event.module.ts) and that the resolver's constructor actually injects them.
- **Cross-request data leak suspected**: confirm both services use `@Injectable({ scope: Scope.REQUEST })`. A missing `Scope.REQUEST` would make them singletons and share state across requests.
