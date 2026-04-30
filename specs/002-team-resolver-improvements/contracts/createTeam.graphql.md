# GraphQL Contract: `createTeam` and `createTeams` mutations

**Feature**: 002-team-resolver-improvements
**Operations**: `Mutation.createTeam`, `Mutation.createTeams`
**File**: `libs/backend/graphql/src/resolvers/team/team.resolver.ts`

This document is the wire contract the active frontend (separate repo) and any other API consumer must rely on after this fix lands. Two things change vs. today: the **return type** and the **error shape**. Frontend migration tracked in [Linear BAD-128](https://linear.app/dashdot/issue/BAD-128).

## Schema (after this feature)

Equivalent SDL view of the code-first definitions:

```graphql
type TeamResult {
  teamId: ID!
  clubId: ID!
  alreadyExisted: Boolean!
}

extend type Mutation {
  """
  Create a team for a club. Idempotent on (link, season): when an existing team
  is found for that pair, returns success with alreadyExisted: true and performs
  no writes. To update an existing team, use updateTeam.
  """
  createTeam(data: TeamNewInput!, nationalCountsAsMixed: Boolean!): TeamResult!

  """
  Batch variant: applies createTeam in order (nationals before mixed; same type
  sorted by team number). Returns one TeamResult per input.
  """
  createTeams(data: [TeamNewInput!]!, nationalCountsAsMixed: Boolean!): [TeamResult!]!
}
```

### Breaking changes (intentional)

- **Old**: `createTeam(...): Team`
- **New**: `createTeam(...): TeamResult!`
- **Old**: `createTeams(...): [Team]`
- **New**: `createTeams(...): [TeamResult!]!`

Callers MUST update their selection sets. The active frontend will be updated in lockstep (BAD-128). The legacy frontend in this repo is reference-only and will not be migrated.

### Behavior changes (intentional)

- **Removed**: the upsert-on-find behavior. When an existing team is found by `(link, season)`, the resolver no longer mutates top-level fields, the `players` roster, or the `EventEntry` / base lineup. Updates flow through `updateTeam` and the per-player / per-base-lineup mutations.

## Success behavior

1. Server fetches `Club` (read-only). On miss → throws `CLUB_NOT_FOUND` (no transaction writes).
2. Server validates authorization (see §Errors). On failure → throws `PERMISSION_DENIED`.
3. If `data.link` is provided, server looks up `Team.findOne({ where: { link, season } })`:
   - **Hit** → server commits the (read-only) transaction and returns `TeamResult { teamId: existing.id, clubId: existing.clubId, alreadyExisted: true }`. **No writes.** Caller responsible for following up with `updateTeam` if changes are intended.
   - **Miss** → proceed to step 4.
4. If `data.teamNumber` is unset, compute it as `MAX(teamNumber)+1` for `(clubId, type, season)` (existing behavior; race acknowledged out of scope).
5. Create `Team`, `setClub(dbClub)`. If `data.players` is set, validate each player exists (throw `PLAYER_NOT_FOUND` on first miss with rollback) and apply the roster diff (add/update/remove memberships, full sync against the input list). If `data.entry` is set, find-or-create the `EventEntry`, validate base-lineup players + their `RankingLastPlace` records (throw `PLAYER_NOT_FOUND` / `RANKING_NOT_FOUND` on first miss with rollback), and persist `entry.meta.competition`.
6. Commit and return `TeamResult { teamId, clubId, alreadyExisted: false }`.

## Error contract

All errors surface as a GraphQL error with a stable, machine-readable `extensions.code`. The English `message` is a human-readable fallback only — clients MUST pin to the code, not the message.

| Code                | When                                                                                       | `extensions` payload                          | Server log severity |
|---------------------|--------------------------------------------------------------------------------------------|-----------------------------------------------|---------------------|
| `CLUB_NOT_FOUND`    | `Club.findByPk(data.clubId)` returns null.                                                 | `{ clubId: ID }`                              | `warn`              |
| `PERMISSION_DENIED` | Anonymous caller, OR authenticated caller without any of: `${dbClub.id}_edit:club`, `edit-any:club`. Note: invalid-token rejections still surface as a transport-layer 401 from the global auth guard before this resolver runs. | `{ userId: ID \| null, clubId: ID }` | `warn` |
| `PLAYER_NOT_FOUND`  | Any `data.players[i].id` (roster) or `data.entry.meta.competition.players[i].id` (base lineup) does not exist. | `{ playerId: ID }` | `warn` |
| `RANKING_NOT_FOUND` | A base-lineup player exists but has no `RankingLastPlace` row in the primary `RankingSystem`. | `{ playerId: ID }` | `warn` |
| `INTERNAL_ERROR`    | Any other thrown error inside the resolver. Internal details (SQL, stack frames) MUST NOT leak. | (none) | `error` |

### Error precedence (deterministic order)

The resolver evaluates conditions in this order so two simultaneous problems always surface as the same code:

1. Fetch `dbClub` (read-only). If missing → `CLUB_NOT_FOUND`.
2. Authorization check (now that `dbClub.id` is known). If fails → `PERMISSION_DENIED`.
3. If `link` provided → idempotency lookup. Hit → success short-circuit (`alreadyExisted: true`).
4. Compute `teamNumber` if missing.
5. Create team + setClub.
6. Apply roster (validate every player exists). First missing player → `PLAYER_NOT_FOUND`.
7. Apply entry (validate base-lineup players exist, then their rankings). First missing player → `PLAYER_NOT_FOUND`. First missing ranking → `RANKING_NOT_FOUND`.

Any unexpected throw at any step → `INTERNAL_ERROR` (after rolling back the transaction).

## Sample requests

### Success — fresh create

```graphql
mutation {
  createTeam(data: { clubId: "9d…", season: 2026, type: MX, /* ... */ }, nationalCountsAsMixed: false) {
    teamId
    clubId
    alreadyExisted   # false
  }
}
```

```json
{
  "data": {
    "createTeam": {
      "teamId": "a1…",
      "clubId": "9d…",
      "alreadyExisted": false
    }
  }
}
```

### Success — idempotent re-submit

Re-running the same `createTeam` call (same `link` + same `season`) returns success without writes:

```json
{
  "data": {
    "createTeam": {
      "teamId": "a1…",
      "clubId": "9d…",
      "alreadyExisted": true
    }
  }
}
```

The caller, if it intended to apply changes, must follow up with `updateTeam`.

### Failure — player not found

Request: `data.players` includes a non-existent player id `bb…`.

```json
{
  "data": null,
  "errors": [
    {
      "message": "Player not found: bb…",
      "path": ["createTeam"],
      "extensions": {
        "code": "PLAYER_NOT_FOUND",
        "playerId": "bb…"
      }
    }
  ]
}
```

### Failure — permission denied

```json
{
  "data": null,
  "errors": [
    {
      "message": "You do not have permission to create a team for this club.",
      "path": ["createTeam"],
      "extensions": {
        "code": "PERMISSION_DENIED",
        "userId": "u1…",
        "clubId": "9d…"
      }
    }
  ]
}
```
