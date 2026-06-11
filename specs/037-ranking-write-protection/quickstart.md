# Quickstart: Ranking Write Protection

**Feature**: 037-ranking-write-protection

## Build & test the affected packages

```bash
pnpm install --frozen-lockfile
pnpm turbo run build --filter=@badman/backend-database --filter=@badman/backend-ranking --filter=@badman/backend-graphql --filter=worker-sync
pnpm turbo run test  --filter=@badman/backend-database --filter=@badman/backend-ranking --filter=@badman/backend-graphql --filter=worker-sync --filter=@badman/backend-enrollment
pnpm turbo run lint --affected   # verifies the new eslint ban catches nothing outside the writer
```

## Local end-to-end check (dev DB)

```bash
npm run docker:up
npm run seed:test-data
npx sequelize-cli db:migrate          # includes the backfill migration

# invariant must be 0 on both tables (psql into the dev DB):
# see specs/037-ranking-write-protection/contracts/ranking-place-writer.md for the query
```

## Key unit scenarios (must pass)

| Suite                                          | Scenario                                                                                                                                                                                                          |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ranking-place-writer.service.spec.ts`         | partial row + existing values → existing preserved (no clobber); new player partial → derived best+maxDiff; unconfigured system → throws; snapshot only advances for newer rankingDate; remove re-points snapshot |
| `get-ranking.processor.spec.ts`                | getViaRanking-success path persists; 1-of-3 scraped + last-known → last-known used; 0-of-3 → skip; payload carries Player id                                                                                      |
| enrollment `index-calculation.service.spec.ts` | unchanged outcomes with `maxDiffLevels: 2` on stub system, EXCEPT no-record player now capped at `amountOfLevels` (12, was 14)                                                                                    |
| `rankingPlace.resolver.spec.ts`                | mutations silently clamp; transaction committed/rolled back per Constitution III/IV pattern                                                                                                                       |

## Rollout

1. **Pre-flight**: run the pre-flight SQL (contracts doc) against prod; configure any system missing `maxDiffLevels`/`amountOfLevels`.
2. **Release A** (PR → `develop`, squash, conventional title): writer service + hook swap + writer refactors + repair fixes + enrollment + eslint + backfill migration. Deploy pipeline runs the migration before serving.
3. **Verify**: invariant SQL = 0 on both tables right after deploy; spot-check a former "impossible 10-7" player (raw DB == GraphQL).
4. **Soak**: wait for the **next bimonthly federation publication** to sync through the new writer; re-run invariant SQL → must still be 0. Tripwire log (`Queueing N players for ranking creation`) should report nothing.
5. **Release B** (separate PR): delete the 9 read patches (`rankingPlace.resolver.ts:40,59`, `player.resolver.ts:193,218,592,627`, `game.resolver.ts:114`, `assembly.resolver.ts:56`) + dead enrollment remnants. Re-verify SC-002 (stored == displayed).
6. **Linear**: update BAD-231/BAD-264 with the corrected analysis (research.md D8); close BAD-264/BAD-265 with Release A, BAD-266 with Release B.
