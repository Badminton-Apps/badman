# Quickstart: Local Verification

## Prerequisites

- `npm run docker:up` running (PostgreSQL, Redis, pgAdmin).
- `.env` populated (Auth0, DB, etc.).
- Optionally `npm run seed:test-data` for fixture data.

## Run

```bash
nx run-many --target=serve --projects=api,worker-sync --parallel
```

API listens on `http://localhost:5010`. GraphQL endpoint at `/graphql` (Playground enabled in development).

## Test 1 — Default (opt-out): no computation

Pick any `EventEntry` ID from the seed data (or your local DB). Send:

```graphql
query NoOptIn {
  eventEntries(args: { take: 5 }) {
    rows {
      id
      enrollmentValidation {
        teams { id }
      }
    }
  }
}
```

Expected:

- Every row returns `enrollmentValidation: null`.
- The API stdout shows **no** `[IndexCalculationService]` log lines for this request.

## Test 2 — Opt-in: validation runs and is tagged

```graphql
query OptIn {
  eventEntries(args: { take: 5 }) {
    rows {
      id
      enrollmentValidation(validate: true) {
        teams { id name }
      }
    }
  }
}
```

Expected:

- Rows now include a non-null `enrollmentValidation` payload (where the entry's team has a club + season).
- API stdout shows lines like:
  ```text
  DEBUG [IndexCalculationService] Index calculation: [EnrollmentValidationService.fetchAndValidate] 33 input(s), 117 player ref(s), 352ms
  ```
  - Verify the `[EnrollmentValidationService.fetchAndValidate]` caller tag is present.
  - Verify only ONE batch per `(clubId, season)` even if multiple entries in the response share a club (DataLoader collapsing).

## Test 3 — Kill-switch (env var)

Stop the API. Set:

```bash
export ENROLLMENT_VALIDATION_DEFAULT_ENABLED=true
nx run-many --target=serve --projects=api,worker-sync --parallel
```

Re-run **Test 1** (without `validate`). Now `enrollmentValidation` returns a payload and `[EnrollmentValidationService.fetchAndValidate]` log lines appear — same as Test 2. Unset the env var to restore default-off behavior.

## Test 4 — Write-path caller tags still appear

Trigger a write that recomputes index:

- `mutation { updateTeam(data: { id: "<some-team-id>", phone: "+32 000" }) { id } }`

API stdout should show:

```text
DEBUG [IndexCalculationService] Index calculation: [TeamsResolver.updateTeam] 1 input(s), 4 player ref(s), 12ms
```

Confirm the caller-tag matches the mutation. Repeat for `createTeams`, `createEntry`, `calculateIndex`, and an `EventEntry.save()` that mutates `meta.competition` (each tagged distinctly).

## Test 5 — Failure propagation (spec FR-006)

Temporarily break the cache (e.g. point `RankingSystem` primary at a non-existent system, or drop a required column in a transaction) and run **Test 2**. Expected: a GraphQL error surfaces; the response is **not** silently `null`.

## Unit tests

```bash
nx test backend-graphql
nx test backend-enrollment
```

All existing tests pass. New tests cover the four resolver behaviors in [research.md §R-005](research.md#r-005-test-strategy) and the caller-tag rendering in `IndexCalculationService`.
