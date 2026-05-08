# GraphQL Contract: `createEnrollment` mutation

**Feature**: 001-fix-enrollment-submit-error
**Operation**: `Mutation.createEnrollment`
**File**: `libs/backend/graphql/src/resolvers/event/competition/enrollment.resolver.ts`

This document is the wire contract the active frontend (separate repo) and any other API consumer must rely on after this fix lands. Two things change vs. today: the **return type** and the **error shape**.

## Schema (after this feature)

Equivalent SDL view of the code-first definitions:

```graphql
type EnrollmentResult {
  teamId: ID!
  subEventCompetitionId: ID!
  alreadyExisted: Boolean!
}

extend type Mutation {
  """
  Enroll a single team into a single sub-event competition.
  Idempotent on (teamId, subEventId): a re-submission of an already-enrolled
  pair returns success with alreadyExisted: true.
  """
  createEnrollment(teamId: ID!, subEventId: ID!): EnrollmentResult!
}
```

### Breaking change (intentional)

- **Old**: `createEnrollment(teamId, subEventId): Boolean`
- **New**: `createEnrollment(teamId, subEventId): EnrollmentResult!`

Callers MUST update their selection sets. The active frontend is in a separate repo and will be updated in lockstep; the legacy frontend in this repo is reference-only and will not be touched.

## Success behavior

1. Server validates authorization (see §Errors below). On failure, throws — no result is returned.
2. Server fetches `Team` and `SubEventCompetition` (with parent `EventCompetition`).
3. Server compares `team.season` to `subEvent.eventCompetition.season`. On mismatch, throws `SEASON_MISMATCH`.
4. Server reads the team's existing entry (`team.getEntry()`):
   - **No existing entry** → create one, attach to the requested sub-event, commit, return `EnrollmentResult { teamId, subEventCompetitionId: subEventId, alreadyExisted: false }`.
   - **Existing entry already at this `subEventId`** → no writes, commit, return `EnrollmentResult { teamId, subEventCompetitionId: subEventId, alreadyExisted: true }`.
   - **Existing entry at a *different* `subEventId`** → reassign the entry to the requested sub-event (existing behavior, unchanged), commit, return `alreadyExisted: false`. *This case is intentionally not flagged separately; out of scope for BAD-21.*

## Error contract

All errors surface as a GraphQL error with a stable, machine-readable `extensions.code`. The English `message` is a human-readable fallback only — clients MUST pin to the code, not the message.

| Code                  | When                                                                                       | `extensions` payload                          | Server log severity |
|-----------------------|--------------------------------------------------------------------------------------------|-----------------------------------------------|---------------------|
| `PERMISSION_DENIED`   | Anonymous caller, OR authenticated caller without any of: `edit:competition`, `${team.clubId}_edit:club`, `edit-any:club`. Note: invalid-token rejections still surface as a transport-layer 401 from the global auth guard before this resolver runs. | `{ userId: ID \| null }`                      | `warn`              |
| `TEAM_NOT_FOUND`      | `Team.findByPk(teamId)` returns null.                                                       | `{ teamId: ID }`                              | `warn`              |
| `SUB_EVENT_NOT_FOUND` | `SubEventCompetition.findByPk(subEventId)` returns null.                                    | `{ subEventId: ID }`                          | `warn`              |
| `SEASON_MISMATCH`     | `team.season !== subEvent.eventCompetition.season`.                                         | `{ teamSeason: Int, competitionSeason: Int }` | `warn`              |
| `INTERNAL_ERROR`      | Any other thrown error inside the resolver. Internal details (SQL, stack frames) MUST NOT leak. | (none)                                    | `error`             |

### Error precedence (deterministic order)

The resolver evaluates conditions in this order so two simultaneous problems always surface as the same code:

1. Fetch `team` (read-only). If missing → `TEAM_NOT_FOUND`.
2. Authorization check (now that `team.clubId` is known). If fails → `PERMISSION_DENIED`.
3. Fetch `subEvent` (with `EventCompetition`). If missing → `SUB_EVENT_NOT_FOUND`.
4. Season check. On mismatch → `SEASON_MISMATCH`.
5. Idempotency / write path.

Any unexpected throw at any step → `INTERNAL_ERROR` (after rolling back the transaction if one was opened).

> Trade-off: fetching the team before the permission check means an unauthorized caller can probe for team-id existence (gets `TEAM_NOT_FOUND` for invalid id, `PERMISSION_DENIED` for valid id without permission). The codebase's existing convention (e.g. `club.resolver.ts`) tolerates the same pattern for club ids. Documented here so reviewers don't flag it as a regression.

## Sample requests

### Success

```graphql
mutation {
  createEnrollment(teamId: "9d…", subEventId: "f3…") {
    teamId
    subEventCompetitionId
    alreadyExisted
  }
}
```

```json
{
  "data": {
    "createEnrollment": {
      "teamId": "9d…",
      "subEventCompetitionId": "f3…",
      "alreadyExisted": false
    }
  }
}
```

### Failure — season mismatch

Request: same as above, but team is in season 2026 and the competition is in season 2025.

```json
{
  "data": null,
  "errors": [
    {
      "message": "Team season does not match competition season.",
      "path": ["createEnrollment"],
      "extensions": {
        "code": "SEASON_MISMATCH",
        "teamSeason": 2026,
        "competitionSeason": 2025
      }
    }
  ]
}
```

### Failure — idempotent ALREADY_ENROLLED is *not* an error

Re-submitting the same `(teamId, subEventId)` returns success, not an error:

```json
{
  "data": {
    "createEnrollment": {
      "teamId": "9d…",
      "subEventCompetitionId": "f3…",
      "alreadyExisted": true
    }
  }
}
```
