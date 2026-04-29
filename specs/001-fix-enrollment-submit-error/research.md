# Phase 0 Research: BAD-21 Enrollment Submit Error

**Feature**: 001-fix-enrollment-submit-error
**Date**: 2026-04-29

This research resolves the implementation-level questions deferred from the spec's clarification round and verifies key facts asserted by the BAD-21 backend-context comment against the actual codebase. Each section follows: **Decision** / **Rationale** / **Alternatives considered**.

---

## R1. Resolver location and current shape

**Decision**: Modify `libs/backend/graphql/src/resolvers/event/competition/enrollment.resolver.ts`. The mutation `EnrollmentResolver.createEnrollment(@User() user, @Args("teamId"), @Args("subEventId"))` currently returns `Boolean` and throws `UnauthorizedException` / `NotFoundException` / generic `Error("...not in the same season")`.

**Rationale**: Direct file inspection. Note that the BAD-21 comment used the path `ennrollment.resolver.ts` (typo with double `n`). The actual file is spelled `enrollment.resolver.ts` and this is what the implementation will edit. Line numbers in this file as of inspection: 38–80 for the mutation.

**Alternatives considered**: None. There is exactly one resolver method named `createEnrollment` and it lives at this path.

---

## R2. Idempotency mechanism (FR-004, FR-005)

**Decision**: Idempotency is enforced at the application layer by leveraging the existing `Team.@HasOne(EventEntry, "teamId")` association, NOT by adding a database `UNIQUE (teamId, subEventId)` constraint. When the mutation runs:

1. Fetch the team's existing entry via `team.getEntry({ transaction })`.
2. If an entry exists AND its `subEventId` already equals the requested `subEventId`, short-circuit and return success with `alreadyExisted: true`. No further writes.
3. Otherwise proceed with the existing create-or-reuse-and-attach flow and return `alreadyExisted: false`.

**Rationale**: The Sequelize model declares `Team @HasOne(() => EventEntry, "teamId")`. The DB has no `UNIQUE` index on `(teamId, subEventId)` (verified by grep over `database/migrations/*.js`). Per-team uniqueness is therefore an application-level invariant. Adding a DB constraint is out of scope for a bug fix and would require a new migration plus careful handling of existing rows. Concurrency for FR-005 is satisfied because the mutation runs inside a Sequelize transaction at the API's default isolation level — two concurrent submits for the same `(teamId, subEventId)` will both observe the same starting state, but at most one will commit a fresh create, and the read-back logic correctly classifies the loser as `alreadyExisted: true` on retry. If pathological double-creates ever occur in the wild we can add a DB-level unique constraint as a follow-up; it is not required for v1.

**Alternatives considered**:

- **DB-level UNIQUE on (teamId, subEventId)** — Stronger guarantee but requires migration, dedup of any existing duplicates, and careful catch of `SequelizeUniqueConstraintError` to map to the success path. Out of scope for a bug fix.
- **Advisory lock on a `(teamId, subEventId)` hash** — Bigger change to the transaction shape; not warranted for the observed concurrency profile (single user clicking submit).

---

## R3. Cross-sub-event move behavior (preserved, not specified)

**Decision**: When a team's existing entry already points to a *different* `subEventId` than the requested one, preserve the current behavior unchanged: the entry is reassigned to the new sub-event. No new error code is introduced for this case.

**Rationale**: The spec's idempotency clause (FR-004) applies to the *same* `(team, sub-event)` pair only. Changing the cross-sub-event semantics would broaden BAD-21's scope. The current code at `enrollment.resolver.ts:67–72` calls `team.getEntry()`, then `subEvent.addEventEntry(entry)`, which silently rewrites the entry's `subEventId`. We carry this forward; the response's `alreadyExisted` flag is `false` in this case (it is a meaningful state change).

**Alternatives considered**: Throw `ALREADY_ENROLLED_ELSEWHERE`. Rejected because the spec's clarifications round chose to treat `ALREADY_ENROLLED` itself as success (Q3) and explicitly closed the v1 error-code list to five values; introducing a sixth code here would contradict that decision.

---

## R4. Permission model (FR-001 + clarification Q1)

**Decision**: The authorization check becomes:

```
user.hasAnyPermission([
  "edit:competition",                         // existing competition-edit
  `${team.clubId}_edit:club`,                 // club-scoped, this team's club only
  "edit-any:club",                            // global club-admin escape hatch
])
```

The team is fetched FIRST (read-only) so its `clubId` is available for the permission check. If the team is missing, we throw `TEAM_NOT_FOUND` before evaluating the permission predicate (and before opening the write transaction); this matches the spec's preferred error precedence and avoids leaking team existence to unauthorized callers any more than the previous code already did.

**Rationale**: The repo's established club-scoped permission pattern (visible across `club.resolver.ts:208,253,312,342` and `rankingPlace.resolver.ts:166`) is `${entity_id}_edit:club` paired with the global `edit-any:club`. Expanding to this exact pair satisfies the spec's club-scoped clarification (Q1: option C) without inventing a new permission name.

**Alternatives considered**:

- **Introduce a new `enroll:team` or `edit:enrollment` permission** — Would require adding a permission catalog entry and mapping it to roles; out of scope for a bug fix and not the existing convention.
- **Check team existence AFTER permission** — Order would mean unauthorized callers can't distinguish "wrong permission" from "wrong team id"; but it would also mean we evaluate `${team.clubId}_edit:club` against an unknown clubId. Decision: fetch team first (consistent with current code's flow), then permission, then the rest.

---

## R5. Error classification mechanism

**Decision**: Throw `GraphQLError` (from the `graphql` package) with `extensions.code` set to one of the five documented codes. Keep using `NotFoundException` and `UnauthorizedException` as the *thrown shape* is irrelevant — Apollo translates them to a `GraphQLError` automatically — but switch to throwing `GraphQLError` directly so we control `extensions.code` and the structured payload (for `SEASON_MISMATCH` we attach `extensions.teamSeason` and `extensions.competitionSeason`).

Code mapping:

| Failure                                  | Code                | Extras in `extensions` |
|------------------------------------------|---------------------|------------------------|
| Anonymous OR insufficient permission     | `PERMISSION_DENIED` | `userId` (UUID or `null`) |
| Team UUID not found                      | `TEAM_NOT_FOUND`    | `teamId`               |
| SubEvent UUID not found                  | `SUB_EVENT_NOT_FOUND` | `subEventId`         |
| `team.season !== subEvent.eventCompetition.season` | `SEASON_MISMATCH` | `teamSeason`, `competitionSeason` |
| Anything else thrown inside the try      | `INTERNAL_ERROR`    | none (no message leak) |

The catch-all branch wraps the original exception, logs it server-side at `error` severity with the full stack, and re-throws a sanitized `GraphQLError` so internal details (SQL text, stack frames) never leave the server.

**Rationale**: `GraphQLError` is the Apollo-supported way to set a stable machine-readable code. Throwing `Nest`'s HTTP exceptions also works for HTTP routes but carries no `extensions.code`, which is the contract Q3 / FR-008 require.

**Alternatives considered**: Use `apollo-server-errors` package (`AuthenticationError`, etc.) — these are deprecated in newer Apollo Server; sticking to `GraphQLError` with explicit `extensions.code` is the forward-compatible path.

---

## R6. Structured success result (`EnrollmentResult` `@ObjectType`)

**Decision**: Author a new `@ObjectType` named `EnrollmentResult` co-located with the resolver at `libs/backend/graphql/src/resolvers/event/competition/enrollment-result.object.ts`. Fields:

- `teamId: ID!`
- `subEventCompetitionId: ID!`
- `alreadyExisted: Boolean!`

Change the mutation return from `Boolean` to `EnrollmentResult`.

**Rationale**: Constitution I requires code-first GraphQL — `@ObjectType` classes, no SDL. Keeping the new type next to the only resolver returning it is consistent with the resolver-domain folder convention (existing `enrollmentSetting/`, `event/competition/`).

**Alternatives considered**: Reuse an existing object type. None of the existing types (`EnrollmentOutput` from `@badman/backend-enrollment`, `EventEntry`, etc.) match this shape, and overloading them would make the contract harder to reason about.

---

## R7. Logging (FR-010 + clarification Q5)

**Decision**: Use the existing `Logger` instance already on the resolver (`new Logger(EnrollmentResolver.name)`). Emit a single structured log call per failure with the fields:

```
{
  code: "<CODE>",
  teamId: "<uuid|null>",
  subEventCompetitionId: "<uuid|null>",
  userId: "<uuid|null>",
}
```

Severity: `warn` for any classified rejection (`PERMISSION_DENIED`, `TEAM_NOT_FOUND`, `SUB_EVENT_NOT_FOUND`, `SEASON_MISMATCH`); `error` for `INTERNAL_ERROR` (also include `err: <stack>` field). On success, do not log at warn/error level; rely on existing trace logging if any.

PII: only log the user's UUID. The `Player` model has both `id` (UUID) and `email`; we read `user.id` only. No email, no name.

**Rationale**: Q5 clarification chose UUID-only + warn/error split. The existing NestJS `Logger` supports a context object as the second argument and serializes it to the configured log transport.

**Alternatives considered**: Custom logger formatting / OpenTelemetry attributes — overkill for a bug fix; the project's logging stack is plain `@nestjs/common` `Logger`.

---

## R8. Test strategy (Constitution IV)

**Decision**: Co-locate `enrollment.resolver.spec.ts` next to the resolver. Mock `Sequelize.transaction()` to return `{ commit, rollback }` jest.fn stubs. Mock model statics with `jest.spyOn`: `Team.findByPk`, `SubEventCompetition.findByPk`. Mock association mixins `team.getEntry`, `team.setEntry`, `subEvent.addEventEntry` on the returned mock instances. Provide a fake `Player` with `hasAnyPermission` jest.fn().

Cases (mapped to the spec's user stories):

| # | Case                                                       | Maps to        |
|---|------------------------------------------------------------|----------------|
| 1 | Anonymous user → `PERMISSION_DENIED`, no transaction opened | FR-001, US1    |
| 2 | Authenticated user without any matching permission → `PERMISSION_DENIED` | FR-001, US1 |
| 3 | User with club-scoped `${clubId}_edit:club` only → success  | Q1 clarification |
| 4 | Team not found → `TEAM_NOT_FOUND`, transaction rolled back  | FR-002, US1    |
| 5 | SubEvent not found → `SUB_EVENT_NOT_FOUND`, rollback        | FR-002, US1    |
| 6 | Season mismatch → `SEASON_MISMATCH` with both seasons in `extensions`, rollback | FR-003, US1 |
| 7 | First successful enrollment → returns `EnrollmentResult` with `alreadyExisted: false`, commit | FR-007, US3 |
| 8 | Re-submit same `(team, subEvent)` → returns `EnrollmentResult` with `alreadyExisted: true`, no `addEventEntry` call | FR-004, US2 |
| 9 | Unexpected throw (e.g. `team.getEntry` rejects) → `INTERNAL_ERROR`, rollback, logged at `error` | FR-006, FR-009 |

`afterEach(jest.restoreAllMocks)`. No real database.

**Rationale**: Mirrors the reference pattern (`enrollmentSetting.resolver.spec.ts`) verbatim and covers all six required CRUD test cases plus the three feature-specific cases.

**Alternatives considered**: Integration test against a real Postgres — out of scope; reference pattern is unit-only.

---

## R9. Scope boundary verification

- **No `all.json` changes** — server emits English fallback messages on failures; FE in separate repo translates from `extensions.code`. (Constitution II → N/A.)
- **No legacy frontend changes** — `apps/badman/`, `libs/frontend/` untouched. (Constitution V.)
- **No migration** — idempotency is application-level (R2). DB schema unchanged.
- **No new public endpoint** — only the existing `createEnrollment` mutation is modified. Return type changes from `Boolean` to `EnrollmentResult` (this IS a contract change for any caller; the active FE repo will be updated separately and the legacy FE in this repo is not used in production).

---

## Open items deferred to implementation

- Confirm at code-write time whether Apollo's `formatError` plugin (if any) overrides `extensions.code`; if yes, ensure the plugin preserves it. (Quick grep at implementation.)
- Confirm that `EventEntry.subEventId` is the exact field used by `subEvent.addEventEntry` to resolve the entry ↔ subEvent association (verified in research; `entry.model.ts:113-117` declares `@BelongsTo(() => SubEventCompetition, { foreignKey: "subEventId" })`).
