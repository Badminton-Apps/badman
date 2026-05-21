# Quickstart: Atomic Team Reorder

How to reproduce the production bug locally, and how to verify the fix once the work in this spec lands.

## Prerequisites

```bash
npm run docker:up                                          # postgres, redis, pgadmin
nx run-many --target=serve --projects=api,worker-sync --parallel
npm run seed:test-data                                     # optional, but useful
```

## Reproducing the current bug (pre-fix)

1. Pick a club in the seed data with at least two same-type/same-season teams (or create them via `createTeam`).
2. Open the GraphQL playground at `http://localhost:5010/graphql`.
3. Fire two `updateTeam` mutations in parallel from two browser tabs (or via `Promise.all` in a script). Both teams in the same `(clubId, season, type)` group:

   ```graphql
   mutation { updateTeam(data: { id: "<TEAM_A>", teamNumber: 2 }) { id teamNumber name } }
   mutation { updateTeam(data: { id: "<TEAM_B>", teamNumber: 1 }) { id teamNumber name } }
   ```

4. Observe: both mutations fail with `extensions.code = "TEAM_NUMBER_CONFLICT"`. The browser HAR capture in the original report (`localhost_Archive [26-05-05 14-47-45].har`, requests `[115]/[116]` and `[183]/[184]`) is the canonical evidence.

5. Inspect the DB:

   ```sql
   SELECT id, "teamNumber", name, abbreviation
     FROM public."Teams"
    WHERE "clubId" = '<CLUB>' AND season = <SEASON> AND type = '<TYPE>';
   ```

## Verifying the fix (post-implementation)

### Contract delta — `teamNumber` no longer accepted on `updateTeam`

```graphql
mutation { updateTeam(data: { id: "<TEAM>", teamNumber: 7 }) { id } }
```

Expected: GraphQL validation error (`Field "teamNumber" is not defined by type "TeamUpdateInput"`).

### Happy path — explicit recalculate after a roster edit

1. Pick a club with two same-type teams whose current ordering is `team_strong (#1, baseIndex 70)`, `team_weak (#2, baseIndex 90)`. Confirm via:

   ```graphql
   query { teams(where: { clubId: "<CLUB>", season: <SEASON>, type: "<TYPE>" }) {
     id teamNumber name abbreviation
   } }
   ```

2. Add a stronger player to `team_weak` so its `baseIndex` drops below `team_strong`'s. The mutation does NOT renumber:

   ```graphql
   mutation {
     updateTeam(data: { id: "<TEAM_WEAK>", players: [{ id: "<STRONG_PLAYER>", membershipType: BASE }, ...existing] }) {
       id name teamNumber
     }
   }
   ```

   Expected: `teamNumber` and `name` are UNCHANGED (still `2` and "<Club> 2…").

3. Call the new recalculate:

   ```graphql
   mutation {
     recalculateTeamNumbersForGroup(
       clubId: "<CLUB>"
       season: <SEASON>
       type: "<TYPE>"            # M | F | MX | NATIONAL
       nationalCountsAsMixed: false
     ) {
       teams { id teamNumber name abbreviation type }
       affectedScope { clubId season types }
     }
   }
   ```

4. Expected:
   - `team_weak.teamNumber == 1`, `team_strong.teamNumber == 2`.
   - `name` and `abbreviation` of both teams regenerated to match the new numbers.
   - Neither name contains `_temp`.
   - `affectedScope.types == [<TYPE>]`.
   - No `TEAM_NUMBER_CONFLICT` raised.

### Happy path — pooled MX + NATIONAL

1. Pick a club with one NATIONAL team (`baseIndex` 60) and two MX teams (`baseIndex` 50 and 80). Per the federation rule, NATIONAL outranks MX, so the strong MX (idx 50) does NOT take slot 1.

2. Call recalculate with pooling on:

   ```graphql
   mutation {
     recalculateTeamNumbersForGroup(
       clubId: "<CLUB>" season: <SEASON> type: MX nationalCountsAsMixed: true
     ) {
       teams { id type teamNumber name }
       affectedScope { types }
     }
   }
   ```

3. Expected final ordering: NATIONAL idx 60 → `1`, MX idx 50 → `2`, MX idx 80 → `3`. `affectedScope.types == [MX, NATIONAL]`. The result `teams` array lists all three teams in this order.

### Concurrent path — parallel recalculates don't deadlock

1. Pick a club with five same-type teams.
2. Fire ten parallel `recalculateTeamNumbersForGroup` calls against the same scope (e.g. via `Promise.all` using `graphql-request`).
3. Expected:
   - Every call succeeds (the advisory lock serializes them; nobody fails).
   - Final group state: `teamNumber` set is exactly `{1, 2, 3, 4, 5}`, ordered by ascending `baseIndex` of the final rosters.
   - No team has `_temp` anywhere.
   - SQL check:

     ```sql
     SELECT array_agg("teamNumber" ORDER BY "teamNumber") AS nums,
            count(*) FILTER (WHERE name LIKE '%\_temp%' OR abbreviation LIKE '%\_temp%' ESCAPE '\') AS temp_rows
       FROM public."Teams"
      WHERE "clubId" = '<CLUB>' AND season = <SEASON> AND type = '<TYPE>';
     -- nums = {1,2,3,4,5}, temp_rows = 0
     ```

### Mid-season frozen — `updateTeam` after the wizard does NOT renumber

1. After the wizard has settled the group at known numbers (say `{1, 2, 3}`), make a mid-season-style edit via `updateTeam` that changes the strongest team's roster so its `baseIndex` would, if recalculated, demote it:

   ```graphql
   mutation {
     updateTeam(data: { id: "<TEAM_AT_1>", players: [/* weaker roster */] }) {
       id teamNumber name
     }
   }
   ```

2. Expected:
   - The mutation succeeds.
   - The team's `teamNumber` is STILL `1`. `name` and `abbreviation` UNCHANGED.
   - Every other team in the group is also unchanged.
   - No call to the recalculate is implied or made.

### Local/staging `_temp` self-heal

No migration ships. Local/staging rows whose `name` or `abbreviation` carries the legacy `_temp` suffix get regenerated the first time their scope is recalculated. To force the heal in a specific scope, call `recalculateTeamNumbersForGroup` for that scope; verify with the SQL above.

## Tests

```bash
nx test backend-graphql                                                   # unit + spec layer
npx jest --config libs/backend/graphql/jest.config.ts \
  --testPathPattern team-renumber                                         # the new resolver + service + integration test
```

The integration test (`team-renumbering.integration.spec.ts`) requires the docker DB to be up.
