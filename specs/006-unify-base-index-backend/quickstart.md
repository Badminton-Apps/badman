# Quickstart: Unify Base-Index Calculation in the Backend

This document is a hands-on smoke test for the new `calculateIndex` GraphQL query and the underlying `IndexCalculationService`. It assumes the implementation tasks (`/speckit-tasks`) are complete and the API is running locally.

## Prerequisites

```bash
npm run docker:up                                    # Postgres + Redis
nx run-many --target=serve --projects=api,worker-sync --parallel
npm run seed:test-data                               # Optional but recommended
```

The API listens on `http://localhost:5010/graphql`. You need a valid Auth0 access token; the dev console / login page in the legacy app produces one.

## Smoke test 1 — Helper-oracle parity (canonical numbers)

Pick three fixtures from `libs/utils/src/lib/get-index.spec.ts` and assert the resolver returns the same numbers.

| Fixture | Type | Players (single/double/mix) | Expected `index` |
|---------|------|------------------------------|------------------|
| F1 | M | 4× (8/8) | **64** |
| F2 | M | 2× (8/8) — only 2 selected | **80** |
| F3 | MX | 2M(8/8/8) + 2F(8/8/8) | **96** |

```graphql
query SmokeParity {
  calculateIndex(
    inputs: [
      {
        key: "F1"
        type: M
        season: 2026
        rankingSystemId: "<primary system id>"
        players: [
          { id: "<m1>", single: 8, double: 8 }
          { id: "<m2>", single: 8, double: 8 }
          { id: "<m3>", single: 8, double: 8 }
          { id: "<m4>", single: 8, double: 8 }
        ]
      }
      {
        key: "F2"
        type: M
        season: 2026
        rankingSystemId: "<primary system id>"
        players: [
          { id: "<m1>", single: 8, double: 8 }
          { id: "<m2>", single: 8, double: 8 }
        ]
      }
      {
        key: "F3"
        type: MX
        season: 2026
        rankingSystemId: "<primary system id>"
        players: [
          { id: "<m1>", single: 8, double: 8, mix: 8, gender: "M" }
          { id: "<m2>", single: 8, double: 8, mix: 8, gender: "M" }
          { id: "<f1>", single: 8, double: 8, mix: 8, gender: "F" }
          { id: "<f2>", single: 8, double: 8, mix: 8, gender: "F" }
        ]
      }
    ]
  ) {
    key
    index
    missingPlayerCount
    error {
      code
      message
    }
  }
}
```

Expect:

```json
{
  "data": {
    "calculateIndex": [
      { "key": "F1", "index": 64, "missingPlayerCount": 0, "error": null },
      { "key": "F2", "index": 80, "missingPlayerCount": 2, "error": null },
      { "key": "F3", "index": 96, "missingPlayerCount": 0, "error": null }
    ]
  }
}
```

If any number disagrees with the helper oracle, the parity test (FR-016b) is broken and SC-005 fails.

## Smoke test 2 — Per-input failure does not fail the batch (FR-002a)

Submit a batch with one valid input and one input that references a non-existent player UUID.

```graphql
query SmokePartialFailure {
  calculateIndex(
    inputs: [
      {
        key: "ok"
        type: M
        season: 2026
        rankingSystemId: "<primary system id>"
        players: [
          { id: "<real player>", single: 8, double: 8 }
        ]
      }
      {
        key: "bad"
        type: M
        season: 2026
        rankingSystemId: "<primary system id>"
        players: [
          { id: "00000000-0000-0000-0000-000000000000" }
        ]
      }
    ]
  ) {
    key
    index
    error { code playerIds }
  }
}
```

Expect:

- `key: "ok"` → numeric `index`, `error: null`
- `key: "bad"` → `index: null`, `error: { code: "PLAYER_NOT_FOUND", playerIds: [...] }`
- HTTP 200 (no `errors` array on the response root)

## Smoke test 3 — Authentication required (FR-006a)

Call the same query without a `Authorization: Bearer ...` header.

Expect: `errors: [{ extensions: { code: "UNAUTHENTICATED" }, ... }]` (or platform-equivalent), HTTP 200 with no `data.calculateIndex`.

## Smoke test 4 — Hook regression (SC-006)

Trigger the entry-model recalculation by saving an `EventEntry` with a changed `meta.competition`. The persisted `meta.competition.teamIndex` MUST equal the value `IndexCalculationService.calculateOne(...)` returns for the same input. The recalculate-entry-index maintenance script is the existing way to mass-trigger this:

```bash
nx run scripts:recalculate-entry-index   # or the equivalent script entry point
```

Compare the resulting `event_entries.meta` values to a snapshot captured *before* this branch was merged. Expectation: byte-identical.

## Smoke test 5 — Validation rejections

| Input | Expected error |
|-------|----------------|
| Empty `inputs` list | `BadRequestException` (HTTP 400 / GraphQL error) |
| Two inputs with the same `key` | `BadRequestException` |
| `rankingSystemId` not a UUID | `BadRequestException` |
| `season` set to year + 5 | `BadRequestException` |

## Cleanup

This feature creates no database state, so there is nothing to roll back after a smoke test.
