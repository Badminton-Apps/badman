# Phase 1 Data Model: BAD-21 Enrollment Submit Error

**Feature**: 001-fix-enrollment-submit-error
**Date**: 2026-04-29

This feature does not introduce new persisted entities or migrations. It introduces one new in-memory GraphQL `@ObjectType` (the structured success result) and re-uses existing Sequelize models unchanged.

## Persisted models (unchanged — referenced for context only)

| Model                    | Schema   | Relevant fields                              | Relevance |
|--------------------------|----------|----------------------------------------------|-----------|
| `Team`                   | `public` | `id`, `clubId`, `season`, `entry` (`@HasOne(EventEntry, "teamId")`) | Subject of enrollment; clubId drives the new club-scoped permission check; season is one half of the SEASON_MISMATCH check |
| `EventEntry`             | `event`  | `id`, `teamId`, `subEventId`, `entryType`, `meta` | The actual enrollment record. One per team (HasOne). |
| `SubEventCompetition`    | `event`  | `id`, parent `eventCompetition` (`@BelongsTo(EventCompetition)`) | Target of enrollment |
| `EventCompetition`       | `event`  | `id`, `season`                                | Other half of the SEASON_MISMATCH check |
| `Player`                 | `personal` | `id`, `hasAnyPermission(...)`               | Authenticated user; only `id` (UUID) is logged on failure |

No fields are added, removed, or constrained. No migration is authored.

## New GraphQL output type (in-memory only)

### `EnrollmentResult`

A code-first `@ObjectType` defined alongside the resolver at
`libs/backend/graphql/src/resolvers/event/competition/enrollment-result.object.ts`.

| Field                    | GraphQL type   | Source                                   | Notes |
|--------------------------|----------------|------------------------------------------|-------|
| `teamId`                 | `ID!`          | The `teamId` argument echoed back        | Lets the client correlate this response with the originating call when N teams are submitted as N parallel calls (Q2: single-item mutation kept). |
| `subEventCompetitionId`  | `ID!`          | The `subEventId` argument echoed back    | Same reason. |
| `alreadyExisted`         | `Boolean!`     | `true` if the team's `EventEntry` already pointed to this `subEventId` before the call; `false` otherwise (created or moved from another sub-event). | Distinguishes the idempotent-success case from a fresh enrollment. (Q3: `ALREADY_ENROLLED` modeled as a flag, not as an error.) |

Validation: all three fields are non-null. No optional fields.

State transitions: none — this is a response payload, not a persisted entity.

## Error payload shape (`extensions` on `GraphQLError`)

This is not a persisted entity but is part of the contract surface and so is documented here for completeness. See `contracts/createEnrollment.graphql.md` for the canonical contract.

| Code                  | `extensions` fields                          |
|-----------------------|----------------------------------------------|
| `PERMISSION_DENIED`   | `userId: ID \| null`                          |
| `TEAM_NOT_FOUND`      | `teamId: ID`                                 |
| `SUB_EVENT_NOT_FOUND` | `subEventId: ID`                             |
| `SEASON_MISMATCH`     | `teamSeason: Int`, `competitionSeason: Int`  |
| `INTERNAL_ERROR`      | (none — internal details deliberately omitted) |

All codes are stable strings; clients pin to the code, not the message.

## Invariants (preserved or newly enforced)

| Invariant                                                     | Where enforced                                  | New or existing |
|---------------------------------------------------------------|-------------------------------------------------|-----------------|
| Exactly one `EventEntry` per `Team`                           | Sequelize `@HasOne` on `Team.entry`             | Existing        |
| The mutation is atomic: all writes succeed or none           | Sequelize transaction wrapping the resolver     | Existing (Constitution III) |
| Re-submit of the same `(teamId, subEventId)` performs no writes and returns `alreadyExisted: true` | New short-circuit in the resolver | NEW |
| Each classified failure carries a stable `extensions.code`    | New `GraphQLError` throws in the resolver       | NEW             |
| `team.season === subEvent.eventCompetition.season` is required for a successful enrollment | Existing check — now classified as `SEASON_MISMATCH` instead of generic `Error` | Existing predicate, classified output |
| User UUID — never email — appears in failure logs             | New structured `Logger` calls                   | NEW             |
