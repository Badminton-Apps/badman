# Phase 1 Data Model: Gate Enrollment Validation Field

## Persistent entities

None added or modified. No migration. No `@badman/backend-database` model change.

## Non-persistent / runtime artifacts

### Config flag

| Name | Type | Default | Lifecycle | Read at |
|---|---|---|---|---|
| `ENROLLMENT_VALIDATION_DEFAULT_ENABLED` | `boolean` | `false` | env var, validated at API boot by the `@badman/utils` config schema | per request inside `EventEntry.enrollmentValidation` resolver |

Behavior matrix:

| GraphQL `validate` arg | `ENROLLMENT_VALIDATION_DEFAULT_ENABLED` | Resolver behavior |
|---|---|---|
| `true` | any | Delegates to `EnrollmentValidationCacheService.getForTeam(team)`. |
| `false` | any | Returns `null` immediately. No cache hit. No DB read. |
| omitted | `false` | Returns `null` immediately. (Default rollout state.) |
| omitted | `true` | Delegates to cache. (Temporary kill-switch state.) |

### GraphQL argument

| Field | Argument | Type | Default (SDL) | Effective default at runtime |
|---|---|---|---|---|
| `EventEntry.enrollmentValidation` | `validate` | `Boolean` (optional) | `false` | resolved by combining the arg with the env flag (table above) |

## Existing data shapes (unchanged, listed for traceability)

- `TeamEnrollmentOutput` (`@badman/backend-enrollment`) — return type. Unchanged.
- `IndexCalculationInput` / `IndexCalculationResult` (`index-calculation.types.ts`) — internal to `IndexCalculationService`. Unchanged.
- `EventEntry`, `Team`, `Player`, `RankingPlace`, `RankingSystem`, `SubEventCompetition` Sequelize models — unchanged.

## State transitions

None. No new persistent state. The flag is read-only at request time; no write path adds state to it.
