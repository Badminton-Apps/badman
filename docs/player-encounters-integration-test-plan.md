# Integration test plan — `playerEncounterCompetitions` query

Version: 1.0 (2026-06-12)

## Why

The `playerEncounterCompetitions` resolver
([`encounter.resolver.ts`](../packages/backend-graphql/src/resolvers/event/competition/encounter.resolver.ts))
runs a hand-written raw SQL query. The existing unit suite
([`encounter.resolver.spec.ts`](../packages/backend-graphql/src/resolvers/event/competition/encounter.resolver.spec.ts))
fully mocks `sequelize.query`, so it verifies **resolver glue** (id extraction,
pagination, error fallback) and **query shape** (CTE + `UNION`, no correlated
subquery) — but it **cannot** prove the SQL is correct against a real schema, nor
that the rewrite returns the same rows as the pre-N+1-fix version, nor that the
new indexes are actually used.

This plan adds a Postgres integration test that closes that gap.

## What the integration test must prove

1. **Correctness** — each of the 6 player-involvement paths returns the encounter:
   1. game leader
   2. temp home captain / temp away captain
   3. home team captain
   4. away team captain
   5. active home/away team membership (respecting `start`/`end` vs `ec.date`)
   6. game player (via `GamePlayerMemberships`)
2. **The 8-completed-games gate** — an encounter with ≠ 8 completed games
   (`winner IS NOT NULL AND winner != 0`) is excluded even when the player is
   involved; exactly 8 is included.
3. **Dedup** — a player involved via multiple paths on the same encounter yields
   one row (the `UNION` contract).
4. **Membership window** — a membership whose `[start, end]` does not span
   `ec.date` is excluded.
5. **Equivalence (regression guard)** — for the same seed, the new CTE+UNION query
   returns the identical id set as the legacy multi-join + correlated-subquery
   query. Embed the legacy SQL as a constant in the test so it stays runnable.

## Blocker to fix first — jest ignores integration specs in backend-graphql

[`packages/backend-graphql/jest.config.ts`](../packages/backend-graphql/jest.config.ts:8)
sets:

```ts
testPathIgnorePatterns: ["/node_modules/", "\\.integration\\.spec\\.ts$"],
```

So `*.integration.spec.ts` files in this package are **never** picked up — the
command documented in `AGENTS.md` (`RUN_INTEGRATION_TESTS=1 pnpm exec jest
--testPathPattern <feature>.integration`) silently finds nothing here. Two
options:

- **Option A (recommended): dedicated integration jest config.** Add
  `packages/backend-graphql/jest.integration.config.ts` that extends the base
  preset but sets `testMatch: ["**/*.integration.spec.ts"]` and drops the ignore
  pattern. Run via `pnpm exec jest -c jest.integration.config.ts`. Keeps the CI
  gate fast (default config still ignores integration) and makes the opt-in
  explicit. Add a `test:integration` script to the package `package.json`.
- **Option B: override at invocation.** Run with
  `--testPathIgnorePatterns /node_modules/` to wipe the integration ignore. One
  less file, but the documented command differs from every other package and is
  easy to get wrong.

Pick A. Update `AGENTS.md` Common Commands + the integration-test convention
block to show the backend-graphql-specific command.

## Test mechanics (follow the `AGENTS.md` integration convention)

- **File** — `packages/backend-graphql/src/resolvers/event/competition/player-encounters.integration.spec.ts`.
- **Opt-in gate** — `const describeOrSkip = process.env["RUN_INTEGRATION_TESTS"] === "1" ? describe : describe.skip;`
  Also skip (warn, don't fail) when `process.env["DB_DIALECT"] !== "postgres"`.
- **Connection** — `dotenv.config()` from monorepo root, then a fresh
  `new Sequelize({ dialect: "postgres", host: DB_IP, port, database, username,
password, models: [<all models from @badman/backend-database>], logging: false })`.
  Pass the **full** model set from the barrel — cross-model associations
  (Team ↔ TeamPlayerMembership, Game ↔ GamePlayerMembership) need the whole graph.
- **Construct the resolver directly** — `new EncounterCompetitionResolver(sequelize, ...stubs)`.
  Only `_sequelize` and the static model methods matter for this query; loader
  services / queue / ranking deps can be `{}`/`null` stubs since
  `playerEncounterCompetitions` doesn't touch them.
- **Sentinel scope** — season `9999`, an ad-hoc club + draw created in
  `beforeAll`; never collide with seed/dev rows.
- **Self-clean** — `beforeEach` wipes the sentinel scope (encounters, games,
  memberships, teams, players keyed to the test club); `afterAll` deletes the
  club + draw and `sequelize.close()`. Use `Op.in` keyed on the created ids.

## Fixture builder

Helper `seedEncounter({ completedGames, involve })` that creates:

- a `DrawCompetition` under the sentinel scope (once, shared),
- home + away `Team`s under the sentinel club,
- an `EncounterCompetition` with `date` inside the membership window,
- `completedGames` rows in `event."Games"` (`linkType='competition'`, `winner=1`),
  plus optional unfinished games (`winner NULL`/`0`) to test the gate boundary,
- the player linkage requested by `involve` (one of: `gameLeader`,
  `tempHomeCaptain`, `tempAwayCaptain`, `homeCaptain`, `awayCaptain`,
  `homeMember`, `awayMember`, `gamePlayer`), with membership `start`/`end`
  controllable to test the window.

Return the encounter id so assertions can match against the resolver output.

## Test cases

| #   | Setup                                                                                     | Expect                    |
| --- | ----------------------------------------------------------------------------------------- | ------------------------- |
| 1   | 8 completed games, player = gameLeader                                                    | encounter returned        |
| 2   | 8 completed, player = tempHomeCaptain                                                     | returned                  |
| 3   | 8 completed, player = tempAwayCaptain                                                     | returned                  |
| 4   | 8 completed, player = home team captain                                                   | returned                  |
| 5   | 8 completed, player = away team captain                                                   | returned                  |
| 6   | 8 completed, active home membership spanning date                                         | returned                  |
| 7   | 8 completed, active away membership spanning date                                         | returned                  |
| 8   | 8 completed, player = game player                                                         | returned                  |
| 9   | 7 completed games, player = gameLeader                                                    | **excluded** (gate)       |
| 10  | 9 completed games, player = gameLeader                                                    | **excluded** (gate)       |
| 11  | 8 completed, membership ends before `ec.date`                                             | **excluded** (window)     |
| 12  | 8 completed, membership starts after `ec.date`                                            | **excluded** (window)     |
| 13  | 8 completed, player is BOTH gameLeader AND game player                                    | returned **once** (dedup) |
| 14  | player uninvolved in an 8-game encounter                                                  | **excluded**              |
| 15  | equivalence: 3–4 mixed encounters seeded; assert new query id-set === legacy query id-set | sets equal                |

## CI

Stays **out of the PR gate** (gate runs `lint test --affected`; the dedicated
integration config + opt-in env var keep it excluded). Document the manual run:

```bash
npm run docker:up
cd packages/backend-graphql
RUN_INTEGRATION_TESTS=1 pnpm exec jest -c jest.integration.config.ts \
  --testPathPattern player-encounters.integration
```

Optionally add a separate, manually-dispatched workflow later that spins up the
`docker-compose.dev.yml` postgres and runs the integration project — not part of
this plan.

## Deliverables checklist

- [ ] `jest.integration.config.ts` in backend-graphql (Option A)
- [ ] `test:integration` script in `packages/backend-graphql/package.json`
- [ ] `player-encounters.integration.spec.ts` with the fixture builder + cases above
- [ ] Legacy SQL embedded as a constant for the equivalence case
- [ ] `AGENTS.md`: correct the backend-graphql integration command
- [ ] Verify the new indexes are hit (`EXPLAIN` spot-check in one test, log-only — not an assertion, since plan choice is data-dependent)
