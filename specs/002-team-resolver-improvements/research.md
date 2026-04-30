# Phase 0 Research: Team Resolver Improvements

**Feature**: 002-team-resolver-improvements
**Date**: 2026-04-30

This research resolves the implementation-level questions deferred from the spec's clarification round and verifies key facts against the actual codebase. Each section follows: **Decision** / **Rationale** / **Alternatives considered**.

---

## R1. Resolver location and current shape

**Decision**: Modify [`libs/backend/graphql/src/resolvers/team/team.resolver.ts`](../../libs/backend/graphql/src/resolvers/team/team.resolver.ts), specifically the `createTeam` method on `TeamsResolver` (lines 176–426 as of inspection). Today it:

- Accepts `@Args("data") TeamNewInput`, `@Args("nationalCountsAsMixed") boolean`, `@User() Player`.
- Returns the full `Team` model.
- Throws `NotFoundException` for missing club, players, ranking; `UnauthorizedException` for missing permission; `BadRequestException` for "Could not create team" guard.
- Wraps everything in a single `Sequelize.transaction()` — already Constitution-III compliant.
- On `link` provided + matching `(link, season)` row found → updates many top-level fields, then proceeds to the players-sync and entry-sync blocks.
- On no `link` match → creates fresh `Team`, attaches club, then runs the players-sync and entry-sync blocks identically.

The `createTeams` batch mutation at line 428 sorts the input list (national before mixed; same type sorted by team number) and delegates to `createTeam` in a loop, returning `Team[]`. After this change it will return `TeamResult[]` because it relies on `createTeam`'s return.

**Rationale**: Direct file inspection. The resolver already lives in the right Nx lib (`libs/backend/graphql`) and the right domain folder (`resolvers/team/`).

**Alternatives considered**: None — the existing location is correct and aligns with the project's resolver-by-domain convention.

---

## R2. Idempotency mechanism (FR-005, FR-006)

**Decision**: Idempotency is enforced at the application layer by leveraging the existing `(link, season)` find inside the transaction:

1. If the request carries a `link`, fetch `Team.findOne({ where: { link, season }, transaction })`.
2. If a row exists → short-circuit: commit the (read-only) transaction and return `TeamResult { teamId: existing.id, clubId: existing.clubId, alreadyExisted: true }`. **No fields, roster, or entry are mutated.**
3. If no row exists (or `link` was not provided) → run the create flow: `Team.create(...)`, `team.setClub(club, ...)`, optionally apply `players` roster (full diff: add/update/remove memberships), optionally create/update `EventEntry` with base lineup `meta.competition.players`. Commit and return `alreadyExisted: false`.

**No DB unique constraint is added** in this change. Verification:

- `grep "unique" database/migrations/*.js | grep -i team` shows the legacy `teams_unique_constraint` on `(name, clubId, teamNumber)` from `20220531163325-cleanup_old.js` was extended in `20230306123554-Teams should be per year.js` to `(year, clubId, teamNumber, type)` and **then dropped entirely** in `20230520140833-removing teams constraint.js`. There is currently no DB-level uniqueness on the `Teams` table that protects `(link, season)`.
- The simultaneous-create window: two requests with the same `(link, season)` racing inside the same default isolation level can both observe "no row" and both insert, producing two rows. This is the same pathology BAD-21 documented and deferred. We do the same here: tighten via tech-debt entry, not in this PR.

**Rationale**: Pure idempotency (no upsert) is the spec's clarification Q2 answer. Removing the upsert-on-find behavior simplifies the resolver, eliminates the duplicate write path with `updateTeam`, and keeps the BAD-21 precedent: app-level invariant in v1, DB constraint in tech-debt.

**Alternatives considered**:

- **Add DB partial unique index `(link, season) WHERE link IS NOT NULL` in this PR.** Stronger guarantee but requires a migration plus a dedup pass on existing rows; out of scope for this fix per Q3 clarification.
- **Use `findOrCreate` with `LOCK.UPDATE` row-locking inside the transaction.** Stronger than plain find-then-create at the cost of a row-level lock and slightly more code; rejected because FR-006 is documented as best-effort under the application-level invariant only.
- **Keep the upsert behavior as-is, just classify errors and add the result shape.** Rejected per Q2: two write paths doing the same thing is the source of complexity; `updateTeam` is the canonical update path.

---

## R3. Removed behavior — upsert-on-find, players-sync, entry-sync

**Decision**: When `createTeam` finds an existing team for `(link, season)`, the following blocks of the current code are skipped entirely:

- The "update values" block (lines 245–260) — top-level field updates.
- The "Adding players to team" block (lines 265–321) — roster diff (memberships add/update/remove).
- The "Adding entry to team" block (lines 323–417) — `EventEntry` creation/move + `meta.competition.players` rebuild from `RankingLastPlace`.

These remain available through the **canonical update paths** that already exist:

- Top-level fields → `updateTeam` mutation (line 463 in the same file). Already handles the temp-name unique-constraint dance for renumbering.
- Roster → `updateTeam` (which accepts a `players` list), or the per-player mutations `addPlayerFromTeam` (line 649) / `removePlayerFromTeam` (line 680) / `updateTeamPlayerMembership` (line 961).
- Entry / base lineup → `addBasePlayerForSubEvent` (line 768), `removeBasePlayerForSubEvent` (line 706), `updatePlayerMetaForSubEvent` (line 834).

Frontend callers (notably the season-rollover flow) must follow `createTeam` with an `updateTeam` call when `alreadyExisted: true` is returned and they want to apply changes. This is the FE migration tracked in [Linear BAD-128](https://linear.app/dashdot/issue/BAD-128).

**Rationale**: Q2 clarification chose pure idempotency. Carrying forward the upsert behavior would defeat the simplification.

**Alternatives considered**: see R2 alternative C.

---

## R4. Permission model (FR-001)

**Decision**: Keep the existing permission check unchanged: `user.hasAnyPermission([\`${dbClub.id}_edit:club\`, "edit-any:club"])`. The club is fetched FIRST (read-only) so its `id` is available for the permission check. If the club is missing, throw `CLUB_NOT_FOUND` before evaluating the permission predicate (and before opening the write portion of the transaction).

The classified-permission rejection now also includes anonymous callers — today the global `PermGuard` provides a stub user whose `hasAnyPermission` returns `false` (or `true` in dev, see `auth.guard.ts`), so the resolver naturally rejects anonymous users with `PERMISSION_DENIED` once the throw is changed to `GraphQLError`. Invalid-token rejections continue to surface as transport-layer 401 from the global guard, unchanged.

**Rationale**: The spec did not call for permission expansion (this is the divergence from BAD-21, which had to add a club-scoped permission because the existing competition-edit perm did not cover club admins; here, the existing `${clubId}_edit:club` already does). No new permission catalog entry is required.

**Alternatives considered**:

- **Add `edit:team` or similar.** Out of scope; existing perms suffice.
- **Check club existence after permission.** Rejected for the same reason as R4 in the enrollment fix: we need `dbClub.id` to evaluate the club-scoped permission, so the club must be fetched first.

---

## R5. Error classification mechanism

**Decision**: Throw `GraphQLError` (from the `graphql` package) with `extensions.code` set to one of the four classified codes plus the `INTERNAL_ERROR` fallback.

Code mapping:

| Failure                                    | Code                | Extras in `extensions` |
|--------------------------------------------|---------------------|------------------------|
| Anonymous OR insufficient permission       | `PERMISSION_DENIED` | `userId` (UUID or `null`), `clubId` |
| `Club.findByPk(clubId)` returns null       | `CLUB_NOT_FOUND`    | `clubId`               |
| Any `players[i].id` not found              | `PLAYER_NOT_FOUND`  | `playerId`             |
| `RankingLastPlace` missing for an entry-base player | `RANKING_NOT_FOUND` | `playerId`        |
| Anything else thrown inside the try        | `INTERNAL_ERROR`    | none (no message leak) |

The catch-all branch wraps the original exception, logs it server-side at `error` severity with the full stack, and re-throws a sanitized `GraphQLError` so internal details (SQL text, stack frames) never leave the server.

The current code throws `BadRequestException("Could not create team")` (line 299) inside the player-sync block as a defensive null-check on `teamDb`. After this change, that branch is dead because the team has just been created and the find-then-create flow guarantees `teamDb` is non-null at that point. Removed.

**Rationale**: `GraphQLError` with `extensions.code` is the contract the spec requires (FR-008). Mirrors BAD-21 exactly.

**Alternatives considered**: `apollo-server-errors` package — deprecated in newer Apollo Server. `GraphQLError` direct is forward-compatible.

---

## R6. Error precedence (deterministic order)

**Decision**: The resolver evaluates conditions in this order so two simultaneous problems always surface as the same code:

1. Fetch `dbClub` (read-only). If missing → `CLUB_NOT_FOUND`.
2. Authorization check (now that `dbClub.id` is known). If fails → `PERMISSION_DENIED`.
3. Idempotency check: if `link` provided, find `(link, season)`. Hit → return success short-circuit.
4. Compute `teamNumber` if not provided (existing `MAX(teamNumber)+1` logic, race acknowledged in spec as out-of-scope).
5. Create team + setClub.
6. Apply `players` roster (validate every player exists → `PLAYER_NOT_FOUND` on first miss; full rollback).
7. Apply `entry` (validate every base-lineup player exists → `PLAYER_NOT_FOUND`; validate every base-lineup ranking exists → `RANKING_NOT_FOUND`; full rollback on either).

Any unexpected throw at any step → `INTERNAL_ERROR` (after rolling back the transaction).

**Rationale**: Identifying the missing club before the permission check is consistent with BAD-21 (and with the codebase convention in `club.resolver.ts`). Identifying the missing player/ranking before completing the entry block ensures the failure surfaces with the offending id.

**Alternatives considered**: Permission first, club second — rejected because the club-scoped permission needs `clubId`.

---

## R7. Structured success result (`TeamResult` `@ObjectType`)

**Decision**: Author a new `@ObjectType` named `TeamResult` co-located with the resolver at `libs/backend/graphql/src/resolvers/team/team-result.object.ts`. Fields:

- `teamId: ID!`
- `clubId: ID!`
- `alreadyExisted: Boolean!`

Change the mutation return from `Team` to `TeamResult`. The `createTeams` batch mutation's return changes from `[Team]` to `[TeamResult]` accordingly.

**Rationale**: Constitution I requires code-first GraphQL — `@ObjectType` classes, no SDL. Keeping the new type next to the only resolver returning it is consistent with the resolver-domain folder convention.

**Alternatives considered**: Reuse `Team`. Rejected per spec clarification Q1 (the breaking change is accepted).

---

## R8. Logging (FR-011)

**Decision**: Use the existing `Logger` instance already on the resolver (`new Logger(TeamsResolver.name)`). Emit a single structured log call per failure with the fields:

```
{
  code: "<CODE>",
  clubId: "<uuid|null>",
  teamId: "<uuid|null>",  // when known (e.g. PLAYER_NOT_FOUND in roster-sync block)
  playerId: "<uuid|null>", // for PLAYER_NOT_FOUND, RANKING_NOT_FOUND
  userId: "<uuid|null>",
}
```

Severity: `warn` for any classified rejection (`PERMISSION_DENIED`, `CLUB_NOT_FOUND`, `PLAYER_NOT_FOUND`, `RANKING_NOT_FOUND`); `error` for `INTERNAL_ERROR` (also include the full stack via the existing `this.logger.warn("rollback", e)` pattern, upgraded to `error`).

PII: only log the user's UUID. The `Player` model has both `id` (UUID) and `email`; we read `user.id` only. No email, no name.

**Rationale**: Mirrors BAD-21's logging shape exactly. The existing `this.logger.warn("rollback", e)` (line 422) is preserved at `error` severity for `INTERNAL_ERROR` so ops can distinguish expected validation rejections from true defects.

**Alternatives considered**: OpenTelemetry attributes — overkill for a bug fix.

---

## R9. Test strategy (Constitution IV)

**Decision**: Modify the existing `team.resolver.spec.ts` (or create one if missing — verify at write time). Mock `Sequelize.transaction()` to return `{ commit, rollback }` jest.fn stubs. Mock model statics with `jest.spyOn`: `Club.findByPk`, `Team.findOne`, `Team.create`, `Team.max`, `Player.findAll`, `RankingLastPlace.findAll`, `RankingSystem.findOne`, `EventEntry.findOrCreate`, `TeamPlayerMembership.findAll`. Mock association mixins (`team.setClub`, `team.addPlayer`, `team.removePlayer`, `team.getEntry`) on returned mock instances. Provide a fake `Player` with `hasAnyPermission` jest.fn().

Cases (mapped to spec user stories and FRs):

| #  | Case                                                       | Maps to                |
|----|------------------------------------------------------------|------------------------|
| 1  | Anonymous user → `PERMISSION_DENIED`, no transaction commit | FR-001, US1            |
| 2  | Authenticated user without any matching permission → `PERMISSION_DENIED` | FR-001, US1 |
| 3  | Club not found → `CLUB_NOT_FOUND`, rollback                 | FR-002, US1            |
| 4  | `players[i].id` not found → `PLAYER_NOT_FOUND` with `playerId` in `extensions`, rollback | FR-003, US1 |
| 5  | Base-lineup player has no `RankingLastPlace` → `RANKING_NOT_FOUND` with `playerId`, rollback | FR-004, US1 |
| 6  | First successful create (no `link` match) → returns `TeamResult { alreadyExisted: false }`, commit | FR-008, US3 |
| 7  | Re-submit with same `(link, season)` → returns `TeamResult { alreadyExisted: true }`, NO `Team.create`, NO `setClub`, NO roster mutation, NO entry mutation, commit | FR-005, US2 |
| 8  | `link` provided but no match → fresh create path (covers idempotency-key-but-miss case) | FR-005 |
| 9  | Unexpected throw inside the transaction → `INTERNAL_ERROR`, rollback, logged at `error`, no SQL/stack in response | FR-007, FR-010 |
| 10 | `createTeams` batch with mixed valid + invalid input → first invalid surfaces with its specific code; later items are not attempted (existing loop behavior; documented for the breaking-return regression test) | regression — `createTeams` |

`afterEach(jest.restoreAllMocks)`. No real database.

**Rationale**: Mirrors the reference pattern (`enrollmentSetting.resolver.spec.ts`) verbatim and covers all six required CRUD test cases plus the four feature-specific cases plus the breaking-return regression on `createTeams`.

**Alternatives considered**: Integration test against a real Postgres — out of scope; reference pattern is unit-only.

---

## R10. Scope boundary verification

- **No `all.json` changes** — server emits English fallback messages on failures; FE in separate repo translates from `extensions.code`. (Constitution II → N/A.)
- **No legacy frontend changes** — `apps/badman/`, `libs/frontend/` untouched. (Constitution V.) The legacy frontend in this repo does still query `createTeam`; since it is reference-only and not deployed, it can stay broken at the GraphQL-document level until/unless someone explicitly removes it. Documented in BAD-128 as "out of scope, repo is reference-only."
- **No migration** — idempotency is application-level (R2). DB schema unchanged.
- **No new public endpoint** — only the existing `createTeam` and `createTeams` mutations are modified. Return type changes are breaking; FE migration is BAD-128.
- **`teamNumber` auto-increment race** — out of scope per spec clarification Q4. No new error code, no new constraint.

---

## Open items deferred to implementation

- Confirm at code-write time whether Apollo's `formatError` plugin (if any) overrides `extensions.code`; if yes, ensure the plugin preserves it. (Quick grep at implementation.)
- Confirm exact return shape of `createTeams` will compile against existing callers in `libs/backend/graphql` (sanity grep for `createTeam(` usages outside the resolver itself — likely none in the backend, all consumers are FE).
- Add a tech-debt entry to [`docs/tech-debt.md`](../../docs/tech-debt.md) for the deferred DB unique partial index on `(link, season) WHERE link IS NOT NULL`, mirroring the BAD-21 entry's wording.
