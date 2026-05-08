# Phase 1 Data Model: Team Resolver Improvements

**Feature**: 002-team-resolver-improvements
**Date**: 2026-04-30

This feature does not introduce new persisted entities or migrations. It introduces one new in-memory GraphQL `@ObjectType` (the structured success result) and re-uses existing Sequelize models unchanged.

## Persisted models (unchanged — referenced for context only)

| Model                    | Schema   | Relevant fields                              | Relevance |
|--------------------------|----------|----------------------------------------------|-----------|
| `Team`                   | `public` | `id`, `clubId`, `season`, `link`, `type`, `teamNumber`, `name`, `abbreviation`, `phone`, `email`, `captainId`, `preferredDay`, `preferredTime`, `prefferedLocationId` | Subject of creation. `link` (cross-season UUID) + `season` is the idempotency key. No DB unique constraint on `(link, season)` (verified absent — the legacy `teams_unique_constraint` was dropped in `20230520140833-removing teams constraint.js`). |
| `Club`                   | `public` | `id`, `name`, `abbreviation`, `useForTeamName` | Required parent; lookup target for `CLUB_NOT_FOUND`; drives `${id}_edit:club` permission. |
| `Player`                 | `personal` | `id`, `gender`, `hasAnyPermission(...)`     | Authenticated user (UUID logged on failure, no email). Also referenced as a roster member or a base-lineup player. |
| `TeamPlayerMembership`   | `public` | `teamId`, `playerId`, `membershipType`, `start`, `end` | Through table for `Team` ↔ `Player`. Touched in the post-create roster-sync block (only on the create path; NOT on the idempotent find path). |
| `EventEntry`             | `event`  | `id`, `teamId`, `subEventId`, `entryType`, `meta` | Created/found in the entry-sync block on the create path. NOT touched on the idempotent find path. |
| `SubEventCompetition`    | `event`  | `id`                                          | Target sub-event for the entry. |
| `RankingSystem`          | `ranking` | `id`, `primary`                              | Used to resolve the primary ranking for the base-lineup ranking lookup. |
| `RankingLastPlace`       | `ranking` | `playerId`, `systemId`, `single`, `double`, `mix` | Source of base-lineup ranking values. Missing → `RANKING_NOT_FOUND`. |

No fields are added, removed, or constrained. No migration is authored.

## New GraphQL output type (in-memory only)

### `TeamResult`

A code-first `@ObjectType` defined alongside the resolver at
`libs/backend/graphql/src/resolvers/team/team-result.object.ts`.

| Field             | GraphQL type | Source                                                | Notes |
|-------------------|--------------|-------------------------------------------------------|-------|
| `teamId`          | `ID!`        | The created or found team's UUID                      | Lets the caller correlate the response with the originating call when N teams are submitted as a `createTeams` batch. |
| `clubId`          | `ID!`        | The team's club UUID                                  | Echoed back for completeness; matches the input `data.clubId` on success. |
| `alreadyExisted`  | `Boolean!`   | `true` if found by `(link, season)` and no writes happened; `false` otherwise (created fresh). | Distinguishes the idempotent-success case from a fresh creation. (Q2: pure idempotency — caller follows up with `updateTeam` if changes are intended.) |

Validation: all three fields are non-null. No optional fields.

State transitions: none — this is a response payload, not a persisted entity.

## Error payload shape (`extensions` on `GraphQLError`)

This is not a persisted entity but is part of the contract surface and so is documented here for completeness. See `contracts/createTeam.graphql.md` for the canonical contract.

| Code                | `extensions` fields                          |
|---------------------|----------------------------------------------|
| `CLUB_NOT_FOUND`    | `clubId: ID`                                  |
| `PERMISSION_DENIED` | `userId: ID \| null`, `clubId: ID`            |
| `PLAYER_NOT_FOUND`  | `playerId: ID`                                |
| `RANKING_NOT_FOUND` | `playerId: ID`                                |
| `INTERNAL_ERROR`    | (none — internal details deliberately omitted) |

All codes are stable strings; clients pin to the code, not the message.

## Invariants (preserved or newly enforced)

| Invariant                                                     | Where enforced                                  | New or existing |
|---------------------------------------------------------------|-------------------------------------------------|-----------------|
| The mutation is atomic: all writes succeed or none           | Sequelize transaction wrapping the resolver     | Existing (Constitution III) |
| Find-by-`(link, season)` short-circuits to success without writes | New short-circuit in the resolver | NEW |
| Each classified failure carries a stable `extensions.code`    | New `GraphQLError` throws in the resolver       | NEW             |
| `createTeam` does NOT update existing teams; updates flow through `updateTeam` | Removed upsert-on-find behavior | NEW (behavior change) |
| User UUID — never email — appears in failure logs             | New structured `Logger` calls                   | NEW             |
| `Team.link` defaults to a fresh UUID on insert                | Existing `@Default(DataType.UUIDV4)` on the model | Existing |

## Out of scope

- DB unique partial index on `(link, season) WHERE link IS NOT NULL` — deferred to tech-debt; mirrors BAD-21.
- DB unique index on `(clubId, type, season, teamNumber)` — would protect the `teamNumber` auto-increment race, but per spec clarification Q4 this is out of scope.
- `TEAM_NUMBER_CONFLICT` error code — out of scope per spec clarification Q4.
