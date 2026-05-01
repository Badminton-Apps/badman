# Research: ClubPlayerMembership Resolver Upgrades

**Branch**: `004-addplayertoclub-return-membership` | **Date**: 2026-04-30

## Finding 1: ClubPlayerMembership model — no `season` field

**Decision**: Use `start` date as the season anchor; no `season` column added. Idempotency natural key = `(clubId, playerId, start)`.

The model at `libs/backend/database/src/models/club-player-membership.model.ts` has fields `id`, `playerId`, `clubId`, `start` (date, NOT NULL), `end` (date, nullable), `confirmed` (boolean), `membershipType` (enum). The compound unique constraint is `ClubPlayerMemberships_playerId_clubId_unique` on `start` (with `playerId` + `clubId` via the Sequelize hack noted at line 91–97 of the model).

**Rationale**: Adding a `season` column would require a migration and backfill — out of scope. The DB-level unique constraint already aligns with `(clubId, playerId, start)`; idempotency in the resolver mirrors the constraint.

**Alternatives considered**:
- Idempotency on `(clubId, playerId, membershipType)` ignoring date — wrong; same player can be `NORMAL` member in season A and `LOAN` in season B at different start dates.
- Idempotency on overlapping date ranges — too permissive; would match `(2025-09-01 → 2026-08-31)` against `(2025-12-01 → 2026-03-01)`. Out of scope; matches what BAD-120 frontend re-submits anyway.

## Finding 2: Current `addPlayerToClub` uses `club.addPlayer()` association — does not return the membership

```ts
// Current (club.resolver.ts:278–286):
await club.addPlayer(player, {
  transaction,
  through: { start, end, membershipType, confirmed },
});
return true;
```

**Decision**: Replace `club.addPlayer()` with `ClubPlayerMembership.create()` so we have a direct handle on the created row to return. Pre-check for existing row via `findOne({ where: { clubId, playerId, start } })` for idempotency.

**Rationale**: The `addPlayer` BelongsToMany association does not return the through-row. Calling `ClubPlayerMembership.create` directly keeps the same DB result with a returnable handle.

**Alternatives considered**:
- Keep `club.addPlayer` and re-query the through row — extra round-trip and timing race risk.
- Use `ClubPlayerMembership.findOrCreate` — built-in Sequelize idempotency. Considered: it returns `[instance, created: boolean]` matching our `alreadyExisted` semantic. **Pick this** — cleaner than manual find-then-create.

**Revised decision**: Use `ClubPlayerMembership.findOrCreate({ where: { clubId, playerId, start }, defaults: { end, membershipType, confirmed }, transaction })`. The `created` boolean inverts to `alreadyExisted = !created`.

## Finding 3: Error code registry needs `MEMBERSHIP_NOT_FOUND`

**Decision**: Append `MEMBERSHIP_NOT_FOUND` to `libs/backend/graphql/src/utils/error-codes.ts` under a new "Club membership" section.

**Rationale**: `updateClubPlayerMembership` and `removePlayerFromClub` both look up a membership by ID and currently throw `NotFoundException`. They need a stable code per FR-009.

## Finding 4: `removePlayerFromClub` has dead `Club.findByPk` / `Player.findByPk` calls

Lines 349–359 of `club.resolver.ts` look up club + player after the membership was already loaded, only to throw `NotFoundException` if either is missing. The membership already has FK guarantees — these lookups are dead weight.

**Decision**: Remove the dead lookups and dead-throws in the same PR. Replace the membership-not-found `NotFoundException` with `MEMBERSHIP_NOT_FOUND` classified error. The per-FK throws had no behavioral value (FK constraint guarantees club/player exist or membership wouldn't).

**Alternatives considered**: Leave the lookups in place — no, they confuse the test matrix and add latency for no benefit.

## Finding 5: Reference implementations for idempotent create

`createTeam` in `team.resolver.ts:177–386` and `createEnrollment` in `enrollment.resolver.ts` both use the pattern:

1. Lookup by natural key with transaction.
2. If found → return result with `alreadyExisted: true`, no write.
3. If not found → create, return result with `alreadyExisted: false`.

Result objects: `TeamResult` (team-result.object.ts) and `EnrollmentResult` (enrollment-result.object.ts) — both `@ObjectType` classes with `@Field` ID echoes plus `alreadyExisted: boolean`.

**Decision**: New `AddPlayerToClubResult` `@ObjectType` follows the same shape:

```ts
@ObjectType({ description: "Result of addPlayerToClub. Idempotent on (clubId, playerId, start)." })
export class AddPlayerToClubResult {
  @Field(() => ID) declare id: string;
  @Field(() => ID) declare clubId: string;
  @Field(() => ID) declare playerId: string;
  @Field(() => Date) declare start: Date;
  @Field(() => Date, { nullable: true }) declare end: Date | null;
  @Field(() => String) declare membershipType: string;
  @Field(() => Boolean, { description: "True when an existing membership matched (clubId, playerId, start) and no write occurred. False when a fresh membership was created." })
  declare alreadyExisted: boolean;
}
```

## Finding 6: Test pattern reference

`libs/backend/graphql/src/resolvers/team/team.resolver.spec.ts` and `enrollmentSetting.resolver.spec.ts` are the closest references. Both:

- `Test.createTestingModule` with mocked `Sequelize` (transaction returns `{ commit, rollback }` jest stubs)
- `jest.spyOn(Model, 'staticMethod')` for model statics
- Fake `Player` with `hasAnyPermission: jest.fn()`
- `afterEach(jest.restoreAllMocks)`
- Cases: success-with-commit, unauthorized → classified error code, not-found → classified error code, exception → rollback

**Decision**: New `club.resolver.spec.ts` (or extend if exists) mirrors this layout for the three target mutations. Each gets the standard 4-case matrix; `addPlayerToClub` gets a 5th case for idempotent re-add.

## Finding 7: `confirmed` flag derivation

Current `addPlayerToClub` sets `confirmed = await user.hasAnyPermission(["change:transfer"])`. This logic must be preserved as-is — orthogonal to this fix.

**Decision**: Keep `confirmed` derivation unchanged. Pass it as a `default` to `findOrCreate`.

## Finding 8: Permission check order

Currently auth is checked **before** the lookup. This is correct (don't leak existence to unauthorized callers). Keep this order in all three mutations.

**Decision**: All three mutations: auth check first → lookup → mutate. No changes to ordering.
