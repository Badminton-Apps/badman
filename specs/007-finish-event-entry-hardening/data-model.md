# Phase 1 Data Model: finishEventEntry Hardening

## New transient types

### `FinishEventEntryResult` (`@ObjectType`, non-persistent)

GraphQL return payload for the `finishEventEntry` mutation. Lives at [`libs/backend/graphql/src/resolvers/event/finish-event-entry-result.object.ts`](../../libs/backend/graphql/src/resolvers/event/finish-event-entry-result.object.ts).

| Field | GraphQL type | TS type | Description |
|-------|-------------|---------|-------------|
| `success` | `Boolean!` | `boolean` | Overall outcome. `true` whenever the resolver returns a value (i.e. did not throw). Provided for symmetry with other mutation result types and for forward-compat. |
| `alreadyFinalised` | `Boolean!` | `boolean` | `true` when every existing `EventEntry` for `(clubId, season)` already had `sendOn !== null` and the call was an idempotent no-op (apart from optional `Club.contactCompetition` update). `false` for fresh finalisation. |
| `notificationDispatched` | `Boolean!` | `boolean` | `true` when the post-commit `notificationService.notifyEnrollment` call returned without throwing. `false` when it threw, OR when on the `alreadyFinalised: true` path (no notification is attempted). |

**Invariants**:
- `alreadyFinalised === true` implies `notificationDispatched === false`.
- `success === false` is currently never returned; resolver throws instead. Field reserved for future "soft failure" outcomes.

## Persistent entities (referenced, not modified structurally)

### `Club` (`@badman/backend-database`)

- Field touched: `contactCompetition: string`
- Mutation behaviour: updated to the supplied `email` argument when (a) on the fresh path and the value differs, or (b) on the `alreadyFinalised: true` path and the value differs.

### `Team` (`@badman/backend-database`)

- Read-only here. Filtered by `(clubId, season)`. Used to enumerate the set of `EventEntry` rows.

### `EventEntry` (`@badman/backend-database`, schema `event`)

- Field touched: `sendOn: Date | null`
- Lock: rows for the resolved `(clubId, season)` set are locked with `LOCK.UPDATE` inside the transaction before the idempotency precheck.
- Mutation behaviour: every entry with `sendOn === null` has it set to `new Date()` on the fresh path. Untouched on the `alreadyFinalised: true` path.

### `Logging` (`@badman/backend-database`, schema `system`)

- One row created on the fresh path with `action = LoggingAction.EnrollmentSubmitted`, `playerId = user.id`, `meta = { clubId, season, email }`.
- Zero rows on the `alreadyFinalised: true` path.
- Zero rows on any error path (covered by transaction rollback).

## Error contract additions

### `ErrorCode.NO_TEAMS_TO_FINALISE`

Added to [`libs/backend/graphql/src/utils/error-codes.ts`](../../libs/backend/graphql/src/utils/error-codes.ts) under a new `// Event entry finalisation` group.

`GraphQLError.extensions` payload:

```ts
{
  code: "NO_TEAMS_TO_FINALISE",
  clubId: string,   // the requested club
  season: number    // the requested season
}
```

## State transitions

```text
                        +----------------------+
                        | client invokes       |
                        | finishEventEntry()   |
                        +----------+-----------+
                                   |
                          (auth check fails) ----> UnauthorizedException
                                   |
                          (club not found) -----> NotFoundException
                                   |
                       BEGIN TRANSACTION
                                   |
              +--------------------+--------------------+
              | lock+read EventEntries for (clubId,season)|
              | read Teams for (clubId,season)             |
              +--------------------+--------------------+
                                   |
                          (zero teams) ----> throw NO_TEAMS_TO_FINALISE
                                   |               (rollback)
                       compute alreadyFinalised
                          /                  \
                         /                    \
                 alreadyFinalised        not yet finalised
                 = true                  = fresh path
                   |                          |
        if email differs:           update club.contactCompetition (if differs)
          update club.contactCompetition      set sendOn on null entries
                   |                          create Logging row
                   |                          |
                COMMIT                     COMMIT
                   |                          |
        return {success, true, false}    notify (post-commit, try/catch)
                                              |
                                  return {success, false, dispatched?}
```
