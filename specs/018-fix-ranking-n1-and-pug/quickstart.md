# Quickstart — Verifying the fix locally

**Branch**: `018-fix-ranking-n1-and-pug` | **Date**: 2026-05-18

This guide walks through validating the two fixes (N+1 cache, pug template) end-to-end on a developer machine. It assumes the standard local setup documented in `AGENTS.md`.

---

## Prerequisites

```bash
# From repo root
npm install
npm run docker:up                       # PostgreSQL + Redis + pgAdmin
npm run seed:test-data                  # Populates a usable dataset
```

You will need at least:
- One `RankingSystem` row with `primary = true`.
- One player with ≥ 5 encounters across competitions.
- One club with ≥ 10 active player memberships and ≥ 1 enrolled team for the current season.

The seed script provides this by default.

---

## Part A — Verify the N+1 fix

### A1. Run the API with SQL logging

Temporarily enable Sequelize logging by setting `LOG_LEVEL=debug` (or equivalent for your local config — check `apps/api/src/main.ts` for the precise switch) and start the API only:

```bash
nx run api:serve
```

### A2. Run `PlayerEncounterCompetitions`

Open Apollo Sandbox at `http://localhost:5010/graphql` and execute:

```graphql
query PlayerEncounterCompetitions($playerId: ID!) {
  player(id: $playerId) {
    id
    encounterCompetitions {
      id
      games {
        id
        players { id single double mix }
      }
    }
  }
}
```

Use the variable `playerId` for a player with ≥ 20 encounters.

**Expected (after fix)**: in the API logs, search for `FROM "ranking"."RankingSystems"`. There MUST be **at most one** such query for the entire HTTP request, regardless of how many games the response contains. Confirms Spec SC-001.

**Before fix**: you would see one query per game.

### A3. Run `GetClubPlayers`

```graphql
query GetClubPlayers($clubId: ID!) {
  club(id: $clubId) {
    id
    players {
      id
      rankingLastPlaces { id rankingSystem { id name } }
    }
  }
}
```

Use a `clubId` for a club with ≥ 30 members.

**Expected (after fix)**: at most one `RankingSystems` query per unique `systemId` in the response. Confirms Spec SC-002.

### A4. Re-run within the TTL window

Re-execute either query within 5 minutes. **Expected**: zero `RankingSystems` queries (cache hit).

### A5. Test invalidation

Execute the `updateRankingSystem` mutation (or any other `RankingSystem` mutation) targeting the primary row. Then immediately re-execute the query from A2.

**Expected**: exactly one `RankingSystems` query (cache was invalidated; cold read). Confirms Spec FR-007.

---

## Part B — Verify the pug template fix

### B1. Render the template in isolation

Quickest path: add a temporary script that calls `CompileService.toHtml('clubenrollment', fixture)` with a fixture matching the three Spec User Story 3 cases:

```ts
// scripts/verify-clubenrollment.ts (local-only, do not commit)
const fixture = {
  years: "2026-2027",
  club: {
    teams: [
      // Case 1: complete entry
      { name: "A", entry: { subEventCompetition: { name: "Sub", eventCompetition: { name: "Event" } }, meta: { competition: { players: [{ firstName: "X", lastName: "Y", memberId: "1", single: 1, double: 1 }] } } }, captain: { firstName: "C", lastName: "C" }, email: "e", phone: "p", type: "M" },
      // Case 2: missing entry
      { name: "B", entry: null, captain: null, type: "M" },
      // Case 3: missing meta.competition
      { name: "C", entry: { subEventCompetition: null, meta: null }, captain: { firstName: "C", lastName: "C" }, email: "e", phone: "p", type: "MX" },
    ],
  },
  locations: [],
  comments: [],
  settingsSlug: "x",
  translate: (k: string) => k,
  moment,
};
```

Run the script and inspect the output HTML.

**Expected (after fix)**:
- No `Syntax Error: Unexpected token`.
- Case 1 renders both the "Afdeling" line and the basisspelers list.
- Case 2 renders "Geen afdeling gekozen" and "Kapitein niet ingevuld".
- Case 3 renders without throwing; basisspelers list is empty.

**Before fix**: rendering throws on the very first `if team?.entry?...` expression.

### B2. End-to-end via the enrollment flow

Trigger a real enrollment finalize mutation against a local club:

```graphql
mutation FinishEventEntry($input: FinishEventEntryInput!) {
  finishEventEntry(input: $input) { success notificationDispatched alreadyFinalised }
}
```

**Expected**: `notificationDispatched: true`. Check the local mail catcher (or your SMTP destination, whatever is configured) — the confirmation email arrives.

**Before fix**: `notificationDispatched: false` and the API logs show the pug Syntax Error.

---

## Part C — Run the test suites

```bash
# New service unit tests
nx test backend-ranking

# Resolver unit tests
nx test backend-graphql

# Affected check across the workspace
nx affected:test --base=develop
```

All MUST pass before opening the PR.

---

## Part D — Pre-merge checklist

- [ ] A1–A5 above all behave as expected.
- [ ] B1 renders the three template cases without errors.
- [ ] B2 emits a real confirmation email locally.
- [ ] `nx affected:test --base=develop` green.
- [ ] `nx affected:lint --base=develop` green.
- [ ] `prettier --check .` passes.
- [ ] The PR description cites Sentry issues 119703170, 119737606, and 119679018 and notes Constitution Principles III (mutation invalidation hook) and IV (resolver test pattern) as touched.

---

## Part E — Post-deploy verification

After the change is deployed to production:

- [ ] Within 24h, Sentry issues 119703170, 119737606, 119679018 receive zero new events. Mark them as resolved with the release SHA.
- [ ] APM dashboard for `PlayerEncounterCompetitions` p90 response time drops by ≥ 20% over a one-week window vs the prior week (Spec SC-006).
- [ ] No new unhandled-rejection alerts fire under `clubenrollment` template rendering.
