# Quickstart: Team Resolver Improvements

**Feature**: 002-team-resolver-improvements
**Audience**: Engineer picking up the implementation; reviewer validating the change.

## TL;DR

Edit one resolver (`team.resolver.ts`), add one new `@ObjectType` file (`team-result.object.ts`), update one spec file (`team.resolver.spec.ts`). Add a tech-debt entry. No migration. No `all.json` change. No frontend work in this repo (FE migration is [BAD-128](https://linear.app/dashdot/issue/BAD-128)).

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
  libs/backend/graphql/src/resolvers/team/team.resolver.spec.ts

# Or the whole lib
nx test backend-graphql

# Or only what's affected by the diff on this branch
nx affected:test
```

## Manual smoke test (after the change is in place)

Pick a club from your local seeded data. From the GraphQL Playground:

```graphql
mutation FreshCreate {
  createTeam(
    data: {
      clubId: "<club-uuid>"
      season: 2026
      type: MX
      teamNumber: 1
    }
    nationalCountsAsMixed: false
  ) {
    teamId
    clubId
    alreadyExisted   # expect false
  }
}
```

Then re-run the same call (carrying the same `link` returned from the first `Team`, or by reusing the same auto-generated link via cross-season rollover):

```graphql
mutation Idempotent {
  createTeam(
    data: {
      clubId: "<club-uuid>"
      season: 2026
      type: MX
      teamNumber: 1
      link: "<link-from-first-create>"
    }
    nationalCountsAsMixed: false
  ) {
    teamId
    clubId
    alreadyExisted   # expect true (no writes happened)
  }
}
```

Trigger each error class:

| Test                                    | How                                                        | Expected `extensions.code`     |
|-----------------------------------------|------------------------------------------------------------|--------------------------------|
| Anonymous request                       | Strip the `Authorization` header                           | `PERMISSION_DENIED`            |
| Authenticated, no permissions           | Use a fresh user with no roles assigned                    | `PERMISSION_DENIED` + `clubId` |
| Bad club id                             | Replace `data.clubId` with a fresh UUID                    | `CLUB_NOT_FOUND`               |
| Bad player in roster                    | Add `data.players: [{ id: "<random-uuid>", membershipType: "REGULAR" }]` | `PLAYER_NOT_FOUND` + `playerId` |
| Bad player in entry base lineup         | Set `data.entry.meta.competition.players[].id` to a random UUID | `PLAYER_NOT_FOUND` + `playerId` |
| Player exists but has no ranking        | Use a real player with no `RankingLastPlace` row in primary system | `RANKING_NOT_FOUND` + `playerId` |
| Server-side bug                         | Force a throw inside the resolver to verify the catch-all   | `INTERNAL_ERROR` (no SQL/stack in response; full stack in server logs at `error`) |

## Review checklist

- [ ] Mutation return type changed from `Team` to `TeamResult`. `createTeams` return changed from `[Team]` to `[TeamResult]`.
- [ ] `TeamResult` `@ObjectType` declared once, co-located with the resolver.
- [ ] Resolver runs entirely inside one Sequelize transaction; `commit` on success, `rollback` on any throw (Constitution III).
- [ ] Authorization checks `[${dbClub.id}_edit:club, edit-any:club]` AFTER the club has been fetched (so `dbClub.id` is known).
- [ ] All five error codes thrown as `GraphQLError` with stable `extensions.code` and the documented per-code `extensions` payload.
- [ ] Idempotent short-circuit: when `data.link` is provided AND a row exists for `(link, season)`, no writes happen and `alreadyExisted: true` is returned.
- [ ] Upsert-on-find behavior REMOVED: the existing-team path no longer mutates top-level fields, roster, or entry. Verified by inspecting the resolver — no field assignments or `addPlayer` / `removePlayer` / `addEventEntry` calls on the `alreadyExisted` branch.
- [ ] `INTERNAL_ERROR` path swallows the original error message in the response but logs the full stack server-side at `error`.
- [ ] Logs use the existing `Logger(TeamsResolver.name)`, contain `code`, `clubId`, `userId` (and `playerId` for player/ranking errors), severity `warn` for classified, `error` for `INTERNAL_ERROR`. No email or other PII.
- [ ] Resolver spec covers the ten cases listed in `research.md` §R9.
- [ ] No edits to `all.json`, `i18n.generated.ts`, `apps/badman/`, or `libs/frontend/`.
- [ ] No new migration.
- [ ] Tech-debt entry added to `docs/tech-debt.md` for the deferred `(link, season)` DB unique partial index, mirroring BAD-21's wording.
- [ ] Frontend migration is tracked in [BAD-128](https://linear.app/dashdot/issue/BAD-128) — not in this PR.
