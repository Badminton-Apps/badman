# Research: Team Name/Abbreviation On-Update Regeneration

**Branch**: `003-linear-bad-127` | **Date**: 2026-04-30

## Finding 1: Model location and hook structure

**Decision**: Fix lives in `libs/backend/database/src/models/team.model.ts`.

Current hooks:
- `@BeforeCreate` + `@BeforeBulkCreate` exist and call `generateName` / `generateAbbreviation`
- No `@BeforeUpdate` or `@BeforeBulkUpdate` hooks exist
- `generateName` and `generateAbbreviation` are already pure static methods that only mutate the passed `instance`

**Rationale**: Both methods are side-effect-free and accept the same `instance` + optional `options` / `club` args. Adding `@BeforeUpdate`/`@BeforeBulkUpdate` is additive and has zero impact on create paths.

## Finding 2: Unique-constraint cascade in updateTeam resolver

**Decision**: Keep the two-phase temp-name cascade in the resolver; use `{ hooks: false }` on intermediate saves.

The `name` field participates in a compound unique constraint `(name, clubId, teamNumber)`. When team 5 → 3 and sibling teams 3, 4 must shift to 4, 5, the intermediate state would cause constraint violations unless a temp name is used. PostgreSQL evaluates UNIQUE per statement (not per transaction) by default, so the workaround is necessary unless constraints are made `DEFERRABLE`.

**Rationale**: Adding `DEFERRABLE INITIALLY DEFERRED` to the unique index is a migration-level change that is out of scope. The temp-name approach works; the only bug is that the final name is constructed manually (and incorrectly — `_setNameAndAbbreviation` ignores `FULL_NAME` and `TEAM_NAME` enum values). Fix: keep temp-phase saves with `{ hooks: false }`, then final saves without `hooks: false` so the hook regenerates correctly.

**Alternatives considered**:
- Add DEFERRABLE migration — out of scope, risky migration on production table.
- Use `Team.bulkUpdate` with `individualHooks: true` — still needs the temp-name ordering, same problem.

## Finding 3: Resolver manual name construction must be removed

**Decision**: Lines 444–451 in `updateTeam` construct name/abbreviation manually using `club.name` regardless of `useForTeamName` enum. This logic is **incorrect** (misses `FULL_NAME`, `TEAM_NAME` cases) and **redundant** once the `@BeforeUpdate` hook is in place. Remove it; the hook on `dbTeam.update(...)` call handles it.

**Rationale**: Keeping both the manual construction and the hook would cause double computation (hook wins anyway). Removing the manual construction eliminates the enum-mishandling bug.

## Finding 4: `_setNameAndAbbreviation` private helper

**Decision**: Retain but narrow its purpose to temp-name-only mode. After the fix, it only needs to produce the `_temp` suffix name for intermediate cascade saves. The final real-name regeneration is owned by the model hook.

**Alternatives considered**: Delete it entirely and inline the temp-name string — keep it for readability; the logic is non-trivial.

## Finding 5: New error code for duplicate team number (FR-007)

**Decision**: Add `TEAM_NUMBER_CONFLICT` to `libs/backend/graphql/src/utils/error-codes.ts`. Throw it in `updateTeam` when the requested `teamNumber` is already occupied by a different team in the same club/season/type.

**Rationale**: Error codes are the contract between backend and frontend per AGENTS.md. Clients can pin behavior to `TEAM_NUMBER_CONFLICT` for user-facing messaging.

## Finding 6: `@BeforeBulkCreate` hook calls both `setAbbriviation` AND `generateAbbreviation` (double-call bug)

```ts
// Current (buggy):
@BeforeBulkCreate
static async setAbbriviations(instances: Team[], options: CreateOptions) {
  for (const instance of instances ?? []) {
    await this.setAbbriviation(instance, options);        // calls generateAbbreviation
    await this.generateAbbreviation(instance, options);   // calls it AGAIN
  }
}
```

`setAbbriviation` (BeforeCreate) calls `generateName` + `generateAbbreviation`. Then `setAbbriviations` (BeforeBulkCreate) calls `setAbbriviation` AND `generateAbbreviation` again — double-computing abbreviation. This is a pre-existing bug; fix it in the same PR since we're touching the hooks region.

**Decision**: Fix `BeforeBulkCreate` to only call `setAbbriviation` (which internally calls both methods). No behavior change for correct data; eliminates unnecessary DB round-trip for club lookup.

## Finding 7: No tests for updateTeam, type-change, or cascade renumber

**Decision**: Add tests per Constitution Principle IV. Required cases:
1. `updateTeam` — team number changes → name and abbreviation regenerated correctly
2. `updateTeam` — type changes → name and abbreviation regenerated
3. `updateTeam` — unrelated field changes → name/abbreviation unchanged (no-op)
4. `updateTeam` — unauthorized → `UnauthorizedException`
5. `updateTeam` — team not found → `NotFoundException`
6. `updateTeam` — duplicate number → `GraphQLError` with `TEAM_NUMBER_CONFLICT`
7. `updateTeam` — success → commits transaction, returns team
8. `updateTeam` — error mid-update → rolls back

Team model hook tests (unit, in `team.model.spec.ts`):
1. `@BeforeUpdate` — `teamNumber` changed → `generateName` and `generateAbbreviation` called
2. `@BeforeUpdate` — `type` changed → both called
3. `@BeforeUpdate` — no relevant field changed → neither called
4. `@BeforeBulkUpdate` — multiple instances → all regenerate
