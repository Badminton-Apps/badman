# Quickstart: Validate `clubId` as UUID at mutation boundary

End-to-end manual walk for SC-001. Run after the implementation tasks land on the branch.

## Prerequisites

- Local services up: `npm run docker:up` (postgres + redis + pgadmin).
- API serving: `nx run-many --target=serve --projects=api,worker-sync --parallel`.
- Seed data loaded: `npm run seed:test-data` if you haven't already.
- A second terminal tailing postgres: `docker compose logs -f postgres | grep --line-buffered "invalid input syntax"`.

## Repro the old failure (sanity, optional)

If you're on `develop` before this branch lands, the following call produces the original log line. Skip this step on the feature branch.

```graphql
mutation {
  recalculateTeamNumbersForGroup(
    clubId: "smash-for-fun"
    season: 2025
    type: M
  ) {
    teams { id }
  }
}
```

Postgres log:

```
ERROR: invalid input syntax for type uuid: "smash-for-fun" at character 288
```

## Verify the fix on the feature branch

Run the same mutation. Expected outcome:

- HTTP 200.
- GraphQL response carries a single error:

  ```json
  {
    "errors": [
      {
        "message": "clubId must be a UUID, got: \"smash-for-fun\"",
        "extensions": {
          "code": "BAD_USER_INPUT",
          "field": "clubId",
          "value": "smash-for-fun"
        }
      }
    ],
    "data": null
  }
  ```

- Postgres log tail stays silent — **no** `invalid input syntax` line.
- API log records the `BAD_USER_INPUT` reject. No transaction was opened.

## Spot-check the other mutations

For each, send a slug as the Club-scoped id arg and confirm the same `BAD_USER_INPUT` shape. None should reach postgres.

- `createTeam(data: { clubId: "smash-for-fun", ... })`
- `createTeams(clubId: "smash-for-fun", ...)`
- `updateClub(data: { id: "smash-for-fun", ... })`
- `removeClub(id: "smash-for-fun")`
- `addPlayerToClub(data: { clubId: "smash-for-fun", ... })`
- `addLocation(data: { clubId: "smash-for-fun", ... })`
- the two `event/entry.resolver.ts` `clubId`-bearing mutations

## Verify the UUID path still works

Pick any real club from the seed data:

```graphql
query { clubs(args: { take: 1 }) { rows { id name } } }
```

Use that `id` to invoke `recalculateTeamNumbersForGroup` (or any other tightened mutation) and confirm normal success behavior — same response shape as today, same DB writes, integration test `team-renumbering.integration.spec.ts` passes:

```bash
RUN_INTEGRATION_TESTS=1 npx jest \
  --config libs/backend/graphql/jest.config.ts \
  --testPathPattern team-renumbering.integration
```

## Run the affected test suite

```bash
nx lint backend-graphql
nx test backend-graphql
```

Expect: 0 failures. New BAD_USER_INPUT cases green. Pre-existing UUID-path cases green.

## Frontend follow-up (out of scope here)

The Next.js frontend repo has a companion change: anywhere it currently passes `clubSlug` as `clubId`, switch to a cached `club(id: slug) { id }` query and pass the returned `id`. See `specs/008-reorder-teams-atomic/frontend-impact.md` for the canonical pattern.
