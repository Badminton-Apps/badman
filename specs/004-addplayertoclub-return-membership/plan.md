# Implementation Plan: ClubPlayerMembership Resolver Upgrades

**Branch**: `004-addplayertoclub-return-membership` | **Date**: 2026-04-30 | **Spec**: [spec.md](spec.md)

## Summary

Bring the three ClubPlayerMembership mutations (`addPlayerToClub`, `updateClubPlayerMembership`, `removePlayerFromClub`) up to the conventions established by 002 and codified in Constitution v1.1.0:

1. `addPlayerToClub` returns a new `AddPlayerToClubResult` `@ObjectType` with idempotent `alreadyExisted` flag (was `Boolean`).
2. All three mutations replace `UnauthorizedException` / `NotFoundException` with classified `GraphQLError` codes from the shared registry; new code `MEMBERSHIP_NOT_FOUND` added for update/remove.
3. Co-located `*.spec.ts` covers the standard CRUD case matrix plus idempotent re-add for `addPlayerToClub`.
4. Implementation switches `addPlayerToClub` from `club.addPlayer()` (which has no return handle) to `ClubPlayerMembership.findOrCreate({ where: { clubId, playerId, start } })`, which returns `[instance, created]` mapping cleanly to `alreadyExisted = !created`.

## Technical Context

**Language/Version**: TypeScript (Node.js 20, Nx monorepo)
**Primary Dependencies**: NestJS, Sequelize + sequelize-typescript, Apollo GraphQL, `graphql` (for `GraphQLError`)
**Storage**: PostgreSQL — `ClubPlayerMembership` table in `public` schema
**Testing**: Jest via Nx (`nx test backend-graphql`)
**Target Platform**: Node.js API server (port 5010)
**Project Type**: NestJS Nx monorepo — library patches only (`@badman/backend-graphql`, `@badman/backend-database` model unchanged)
**Performance Goals**: One `findByPk` per mutation (existing) plus one `findOrCreate` for `addPlayerToClub` (replaces current `addPlayer` association call). Net: ±0 round-trips.
**Constraints**: No DB schema changes. Must maintain backwards-compatible auth (`${clubId}_edit:club` / `edit-any:club`).
**Scale/Scope**: Single resolver file + one new result object + one error code addition + tests.

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code-First GraphQL via Sequelize Models | PASS | `ClubPlayerMembership` model unchanged. New `@ObjectType` `AddPlayerToClubResult` is a thin result wrapper, not an entity — same convention as `TeamResult` / `EnrollmentResult`. |
| II. Translation Discipline | PASS | No i18n changes. |
| III. Transactional Mutations | PASS | All three mutations remain transactional. Idempotency clause (v1.1.0) explicitly satisfied for `addPlayerToClub`. |
| IV. Resolver Test Discipline | REQUIRES WORK | Three mutations have zero/insufficient test coverage. Spec FR-011/FR-012 mandate full matrix. |
| V. Legacy Frontend Boundary | PASS | No frontend changes. |

No violations.

## Project Structure

### Documentation (this feature)

```text
specs/004-addplayertoclub-return-membership/
├── plan.md              ← this file
├── research.md          ← Phase 0 findings
├── data-model.md        ← Phase 1 entities + state transitions
└── tasks.md             ← Phase 2 output (/speckit-tasks)
```

### Source Code (affected files)

```text
libs/backend/graphql/src/utils/
└── error-codes.ts                                   ← add MEMBERSHIP_NOT_FOUND

libs/backend/graphql/src/resolvers/club/
├── add-player-to-club-result.object.ts              ← NEW @ObjectType
├── club.resolver.ts                                 ← upgrade three mutations
└── club.resolver.spec.ts                            ← NEW or extend with full case matrix
```

## Phase 0: Research (complete)

See [research.md](research.md). Key decisions:

1. Idempotency natural key = `(clubId, playerId, start)` — matches DB unique constraint. No `season` column to worry about.
2. Implementation uses `ClubPlayerMembership.findOrCreate` — built-in Sequelize idempotency primitive that maps cleanly to `alreadyExisted = !created`.
3. New `MEMBERSHIP_NOT_FOUND` error code for update/remove paths.
4. Dead `Club.findByPk`/`Player.findByPk` lookups in `removePlayerFromClub` removed (FK guarantees).
5. Reference impls: `TeamResult`, `EnrollmentResult` for the `@ObjectType`; `team.resolver.spec.ts`, `enrollmentSetting.resolver.spec.ts` for tests.
6. `confirmed` derivation (from `change:transfer` permission) preserved unchanged.

## Phase 1: Design & Contracts

See [data-model.md](data-model.md). No schema changes.

### Mutation contracts (after fix)

```graphql
type Mutation {
  addPlayerToClub(data: ClubPlayerMembershipNewInput!): AddPlayerToClubResult!
  updateClubPlayerMembership(data: ClubPlayerMembershipUpdateInput!): Boolean!
  removePlayerFromClub(id: ID!): Boolean!
}

type AddPlayerToClubResult {
  id: ID!
  clubId: ID!
  playerId: ID!
  start: Date!
  end: Date
  membershipType: String!
  alreadyExisted: Boolean!
}
```

**Breaking change**: `addPlayerToClub` previously returned `Boolean!`. Frontend callers must update — this is the explicit intent of BAD-129.

### Error contract

| Resolver | Failure | Code | Extensions |
|----------|---------|------|------------|
| addPlayerToClub | Caller lacks permission | `PERMISSION_DENIED` | — |
| addPlayerToClub | Club ID not found | `CLUB_NOT_FOUND` | `{ clubId }` |
| addPlayerToClub | Player ID not found | `PLAYER_NOT_FOUND` | `{ playerId }` |
| updateClubPlayerMembership | Membership ID not found | `MEMBERSHIP_NOT_FOUND` | `{ membershipId }` |
| updateClubPlayerMembership | Caller lacks permission | `PERMISSION_DENIED` | — |
| removePlayerFromClub | Membership ID not found | `MEMBERSHIP_NOT_FOUND` | `{ membershipId }` |
| removePlayerFromClub | Caller lacks permission | `PERMISSION_DENIED` | — |

### Implementation steps (ordered)

#### Step 1 — Add error code

**File**: `libs/backend/graphql/src/utils/error-codes.ts`

Append to the `ErrorCode` const, under a new "Club membership" comment block:

```ts
// Club membership (libs/backend/graphql/src/resolvers/club/club.resolver.ts)
MEMBERSHIP_NOT_FOUND: "MEMBERSHIP_NOT_FOUND",
```

---

#### Step 2 — Create `AddPlayerToClubResult` ObjectType

**File**: `libs/backend/graphql/src/resolvers/club/add-player-to-club-result.object.ts` (NEW)

Mirror the shape of `TeamResult` / `EnrollmentResult`. Fields per data-model.md.

---

#### Step 3 — Upgrade `addPlayerToClub` mutation

**File**: `libs/backend/graphql/src/resolvers/club/club.resolver.ts`

Change return type: `@Mutation(() => Boolean)` → `@Mutation(() => AddPlayerToClubResult)`.

Replace body:

```ts
async addPlayerToClub(
  @User() user: Player,
  @Args("data") data: ClubPlayerMembershipNewInput,
): Promise<AddPlayerToClubResult> {
  if (!(await user.hasAnyPermission([`${data.clubId}_edit:club`, "edit-any:club"]))) {
    throw new GraphQLError("Permission denied", {
      extensions: { code: ErrorCode.PERMISSION_DENIED },
    });
  }

  const transaction = await this._sequelize.transaction();
  try {
    const club = await Club.findByPk(data.clubId, { transaction });
    if (!club) {
      throw new GraphQLError(`Club not found`, {
        extensions: { code: ErrorCode.CLUB_NOT_FOUND, clubId: data.clubId },
      });
    }
    const player = await Player.findByPk(data.playerId, { transaction });
    if (!player) {
      throw new GraphQLError(`Player not found`, {
        extensions: { code: ErrorCode.PLAYER_NOT_FOUND, playerId: data.playerId },
      });
    }

    const confirmed = await user.hasAnyPermission(["change:transfer"]);

    const [membership, created] = await ClubPlayerMembership.findOrCreate({
      where: { clubId: data.clubId, playerId: data.playerId, start: data.start },
      defaults: {
        end: data.end,
        membershipType: data.membershipType,
        confirmed,
      },
      transaction,
    });

    await transaction.commit();

    return {
      id: membership.id,
      clubId: membership.clubId!,
      playerId: membership.playerId!,
      start: membership.start,
      end: membership.end ?? null,
      membershipType: membership.membershipType as string,
      alreadyExisted: !created,
    };
  } catch (error) {
    this.logger.error(error);
    await transaction.rollback();
    throw error;
  }
}
```

Note: `findOrCreate` runs inside the transaction so concurrent re-submits serialize on the unique constraint.

---

#### Step 4 — Upgrade `updateClubPlayerMembership` mutation

**File**: same

Replace `NotFoundException` and `UnauthorizedException` with `GraphQLError`:

```ts
const membership = await ClubPlayerMembership.findByPk(data.id);
if (!membership) {
  throw new GraphQLError("Membership not found", {
    extensions: { code: ErrorCode.MEMBERSHIP_NOT_FOUND, membershipId: data.id },
  });
}

if (!(await user.hasAnyPermission([`${membership.clubId}_edit:club`, "edit-any:club"]))) {
  throw new GraphQLError("Permission denied", {
    extensions: { code: ErrorCode.PERMISSION_DENIED },
  });
}
// transaction body unchanged
```

---

#### Step 5 — Upgrade `removePlayerFromClub` mutation

**File**: same

Replace `NotFoundException` for membership with `MEMBERSHIP_NOT_FOUND`. Replace `UnauthorizedException` with `PERMISSION_DENIED`. **Remove** the dead `Club.findByPk` / `Player.findByPk` lookups (current lines 349–359) — FK constraints make them redundant.

```ts
async removePlayerFromClub(@User() user: Player, @Args("id", { type: () => ID }) id: string) {
  const membership = await ClubPlayerMembership.findByPk(id);
  if (!membership) {
    throw new GraphQLError("Membership not found", {
      extensions: { code: ErrorCode.MEMBERSHIP_NOT_FOUND, membershipId: id },
    });
  }

  if (!(await user.hasAnyPermission([`${membership.clubId}_edit:club`, "edit-any:club"]))) {
    throw new GraphQLError("Permission denied", {
      extensions: { code: ErrorCode.PERMISSION_DENIED },
    });
  }

  const transaction = await this._sequelize.transaction();
  try {
    await membership.destroy({ transaction });
    await transaction.commit();
    return true;
  } catch (error) {
    this.logger.error(error);
    await transaction.rollback();
    throw error;
  }
}
```

Imports cleanup: drop `NotFoundException`, `UnauthorizedException` from `@nestjs/common`; add `GraphQLError` from `graphql`; add `ErrorCode` from `../../utils/error-codes`.

---

#### Step 6 — Write resolver tests

**File**: `libs/backend/graphql/src/resolvers/club/club.resolver.spec.ts` (NEW or extend)

Follow `team.resolver.spec.ts` pattern.

**`addPlayerToClub` cases** (5):

1. Unauthorized → `GraphQLError` with `extensions.code === PERMISSION_DENIED`
2. Club not found → `GraphQLError` with `CLUB_NOT_FOUND` and `extensions.clubId`
3. Player not found → `GraphQLError` with `PLAYER_NOT_FOUND` and `extensions.playerId`
4. Success — first add → returns result with `alreadyExisted: false`, transaction committed
5. Idempotent re-add → returns same result with `alreadyExisted: true`, no fresh row

**`updateClubPlayerMembership` cases** (4):

1. Unauthorized → `PERMISSION_DENIED`
2. Membership not found → `MEMBERSHIP_NOT_FOUND`
3. Success → `update` called, transaction committed, returns `true`
4. Exception during update → transaction rolled back, error rethrown

**`removePlayerFromClub` cases** (4):

1. Unauthorized → `PERMISSION_DENIED`
2. Membership not found → `MEMBERSHIP_NOT_FOUND`
3. Success → `destroy` called, transaction committed, returns `true`
4. Exception during destroy → rolled back

Mock setup mirrors `team.resolver.spec.ts`:

```ts
const mockSequelize = {
  transaction: jest.fn().mockResolvedValue({
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
  }),
};

jest.spyOn(ClubPlayerMembership, "findByPk").mockResolvedValue(...);
jest.spyOn(ClubPlayerMembership, "findOrCreate").mockResolvedValue([fakeMembership, true]);

const fakeUser = { hasAnyPermission: jest.fn().mockResolvedValue(true) } as unknown as Player;
```

Assertions: catch the thrown `GraphQLError` and assert `error.extensions.code` equals the expected constant.

## Complexity Tracking

No constitution violations. No complexity justifications needed.
