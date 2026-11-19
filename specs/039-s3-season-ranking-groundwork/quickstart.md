# Quickstart: Season and Ranking Reference-Date Groundwork

How to check each user story locally. Run from the repo root with Node 22 and the docker dev database up (`npm run docker:up`).

## Before you start

The characterization tests from BAD-409 are the safety net. They must be green before and after every step:

```bash
pnpm turbo run test --filter=@badman/utils --filter=@badman/backend-graphql \
  --filter=@badman/backend-change-encounter --filter=@badman/backend-enrollment \
  --filter=@badman/backend-assembly --filter=@badman/backend-transfer-loan \
  --filter=@badman/backend-twizzit --filter=worker-sync
```

Tests run in UTC by default (`jest.global-setup.js`). The season helper suite re-runs itself in Europe/Brussels.

## US1: season module (BAD-390)

```bash
cd packages/utils && pnpm test
TZ=Europe/Brussels pnpm test   # module results must be identical in both runs
```

Expected: the new module tests pass in both timezones with the same results, and `comp.spec.ts` (BAD-409) passes unchanged.

## US2: callers (BAD-391)

```bash
pnpm turbo run lint test --filter=...[feat/refactor]
grep -rnE "getMonth\(\) *[<>=]|getFullYear\(\) *===|\.month\(\) *[<>=]" apps packages database \
  --include='*.ts' | grep -v -E "spec|dist|node_modules|packages/utils/src/lib/season"
```

Expected:

- The grep finds no season derivation outside the module (SC-001). `calculate-index.resolver.ts` stays, see research R9.
- The BAD-409 tests named "current behaviour, fixed in BAD-391" now fail. Flip them to the regulation behaviour in the same commit as the fix (FR-018).
- The tests named "depends on the server timezone" change on purpose (research R2).
- All other BAD-409 tests pass unchanged.

## US3: ranking reference dates and lookup (BAD-392)

```bash
# unit tests (CI)
pnpm turbo run test --filter=@badman/backend-database --filter=@badman/backend-enrollment \
  --filter=@badman/backend-assembly --filter=worker-sync

# integration tests against the dev postgres (opt-in, not in CI)
(cd packages/backend-competition/enrollment && RUN_INTEGRATION_TESTS=1 pnpm exec jest index-calculation.integration)
(cd packages/backend-competition/assembly && RUN_INTEGRATION_TESTS=1 pnpm exec jest ranking-lookups.integration)
(cd apps/worker/sync && RUN_INTEGRATION_TESTS=1 pnpm exec jest entry.integration)
```

Expected: every integration test returns the same place as before, except the sync worker test "takes the newest place of any ranking system", which flips to the system-filtered place (FR-014). The line-up cache test flips to "does not reuse across seasons or systems" (FR-015).

## Before release

Run the read-only production checks in [research.md](research.md) (R1, R3, R7) and note the results in the PR.
