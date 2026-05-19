# Quickstart — Local Validation

End-to-end check that the DataLoader-based `TeamAssociationService` matches the post-#920 baseline.

## Prerequisites

- Docker stack running: `npm run docker:up`
- Local DB seeded with at least one club having ≥10 teams (use `npm run seed:test-data` if needed).
- `dataloader` dep installed (added by this PR): verify with `node -e "require('dataloader')"`.

## 1. Unit tests

```bash
nx test backend-graphql --testPathPattern team-association
```

Expected: 7 tests pass. No new warnings on stdout.

## 2. Full lib test sweep

```bash
nx test backend-graphql
```

Expected: identical pass/fail count to baseline (`fix/club-players-teams-n1` branch). Only the 8 pre-existing `enrollment.resolver.spec` failures should remain.

## 3. Lint

```bash
nx lint backend-graphql
```

Expected: `✖ 37 problems (1 error, 36 warnings)` — identical to baseline (per SC-003). Specifically check `team-association.service.ts` shows zero new lint issues.

## 4. Manual SQL trace

Start the API in dev with Sequelize logging on:

```bash
SEQUELIZE_LOG=1 nx run api:serve
```

Issue this GraphQL query (Insomnia / curl / Postman) against a club with ≥10 teams:

```graphql
query QuickstartGetClubTeams($clubId: ID!) {
  club(id: $clubId) {
    id
    teams {
      id
      players { id }
      captain { id }
      locations { id }
      club { id }
      entry { id }
    }
  }
}
```

In the API logs, count `SELECT` statements against:

- `"Players"` (captain loader) — expect **2** (one for captain ids, one for the `TeamPlayerMembership` join's `include`)
- `"Locations"` — expect **1**
- `"Clubs"` — expect **1**
- `event."EventEntries"` — expect **1**
- `"TeamPlayerMemberships"` — expect **1**

Total ≈ 6 association queries (5 loaders + the players loader's join produces 2 SQL statements in Sequelize). Critically: the count is **constant** in team count, not linear (per SC-001).

## 5. Re-run a second time

Issue the same query again. The DataLoaders should be **freshly constructed** (request-scoped) — same query count fires (no cross-request cache, per FR-003 and SC-001 baseline behaviour).

## 6. Sentry watch (post-deploy)

After merge + deploy, monitor `POST /graphql (query GetClubTeams)` in Sentry for 24 hours. Zero new N+1 events expected (per SC-004). The previously-resolved issues `119723285` and `119740683` should remain quiet.

## Rollback

If a regression appears: `git revert <merge-commit>` and re-deploy. No data migration; no flag flip.
