# Quickstart: BAD-21 Enrollment Submit Error fix

**Feature**: 001-fix-enrollment-submit-error
**Audience**: Engineer picking up the implementation; reviewer validating the change.

## TL;DR

Edit one resolver (`enrollment.resolver.ts`), add one new `@ObjectType` file (`enrollment-result.object.ts`), update one spec file (`enrollment.resolver.spec.ts`). No migration. No `all.json` change. No frontend work in this repo.

## Run the API locally

```bash
npm run docker:up                                          # Postgres + Redis + pgAdmin
nx run-many --target=serve --projects=api,worker-sync --parallel
```

The API serves at `http://localhost:5010/graphql`.

## Run the tests

```bash
# Just this resolver's spec
npx jest --config libs/backend/graphql/jest.config.ts \
  libs/backend/graphql/src/resolvers/event/competition/enrollment.resolver.spec.ts

# Or the whole lib
nx test backend-graphql

# Or only what's affected by the diff on this branch
nx affected:test
```

## Manual smoke test (after the change is in place)

Pick a team and a sub-event from your local seeded data so that `team.season === subEventCompetition.season`. From the GraphQL Playground:

```graphql
mutation FreshEnrollment {
  createEnrollment(teamId: "<team-uuid>", subEventId: "<sub-event-uuid>") {
    teamId
    subEventCompetitionId
    alreadyExisted   # expect false
  }
}
```

Then re-run the same mutation:

```graphql
mutation Idempotent {
  createEnrollment(teamId: "<team-uuid>", subEventId: "<sub-event-uuid>") {
    teamId
    subEventCompetitionId
    alreadyExisted   # expect true (BAD-21 idempotency)
  }
}
```

Trigger each error class:

| Test                                  | How                                              | Expected `extensions.code`     |
|---------------------------------------|--------------------------------------------------|--------------------------------|
| Anonymous request                     | Strip the `Authorization` header                 | `PERMISSION_DENIED`            |
| Authenticated, no permissions         | Use a fresh user with no roles assigned          | `PERMISSION_DENIED`            |
| Bad team id                           | Replace teamId with a fresh UUID                 | `TEAM_NOT_FOUND`               |
| Bad sub-event id                      | Replace subEventId with a fresh UUID             | `SUB_EVENT_NOT_FOUND`          |
| Season mismatch                       | Use a team and sub-event from different seasons  | `SEASON_MISMATCH` + `teamSeason` + `competitionSeason` |
| Server-side bug                       | Force a throw inside the resolver to verify the catch-all | `INTERNAL_ERROR` (no SQL/stack in response; full stack in server logs at `error`) |

## Review checklist

- [ ] Mutation return type changed from `Boolean` to `EnrollmentResult`.
- [ ] `EnrollmentResult` `@ObjectType` declared once, co-located with the resolver.
- [ ] Resolver runs entirely inside one Sequelize transaction; `commit` on success, `rollback` on any throw (Constitution III).
- [ ] Authorization checks `[edit:competition, ${team.clubId}_edit:club, edit-any:club]` and only after the team has been fetched (so `team.clubId` is known).
- [ ] All five error codes thrown as `GraphQLError` with stable `extensions.code` and the documented per-code `extensions` payload.
- [ ] Idempotent short-circuit: if `team.entry?.subEventId === subEventId`, no further writes happen and `alreadyExisted: true` is returned.
- [ ] `INTERNAL_ERROR` path swallows the original error message in the response but logs the full stack server-side at `error`.
- [ ] Logs use the existing `Logger(EnrollmentResolver.name)`, contain `code`, `teamId`, `subEventCompetitionId`, `userId`, severity `warn` for classified, `error` for `INTERNAL_ERROR`. No email or other PII.
- [ ] Resolver spec covers the nine cases listed in `research.md` §R8.
- [ ] No edits to `all.json`, `i18n.generated.ts`, `apps/badman/`, or `libs/frontend/`.
- [ ] No new migration.
