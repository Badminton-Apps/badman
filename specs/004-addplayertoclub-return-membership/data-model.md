# Data Model: ClubPlayerMembership Resolver Upgrades

**Branch**: `004-addplayertoclub-return-membership` | **Date**: 2026-04-30

## No schema changes

This fix is purely resolver + result-object level. No new tables, columns, or migrations.

## Existing entity (unchanged)

### ClubPlayerMembership — `libs/backend/database/src/models/club-player-membership.model.ts`

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | PK |
| `playerId` | UUID | FK → Player. Required. Indexed `player_club_index`. |
| `clubId` | UUID | FK → Club. Required. Indexed `player_club_index`. |
| `start` | Date | Required. Part of compound unique constraint `ClubPlayerMemberships_playerId_clubId_unique`. |
| `end` | Date \| null | Open-ended membership when null. |
| `confirmed` | boolean | Default false. Set true when caller has `change:transfer` permission. |
| `membershipType` | enum (`NORMAL`, `LOAN`, `TRANSFER`) | Default `NORMAL`. |

**Compound unique constraint**: `(playerId, clubId, start)` — drives idempotency natural key.

**No `season` column**. Season is implicit in `start` date.

## New result type (Phase 1)

### AddPlayerToClubResult — `libs/backend/graphql/src/resolvers/club/add-player-to-club-result.object.ts`

| Field | Type | Source |
|-------|------|--------|
| `id` | ID | `ClubPlayerMembership.id` |
| `clubId` | ID | `ClubPlayerMembership.clubId` |
| `playerId` | ID | `ClubPlayerMembership.playerId` |
| `start` | Date | `ClubPlayerMembership.start` |
| `end` | Date \| null | `ClubPlayerMembership.end` |
| `membershipType` | String | `ClubPlayerMembership.membershipType` |
| `alreadyExisted` | Boolean | `true` when lookup matched, `false` when new row created |

## Error code registry additions

| Code | Trigger | Used by |
|------|---------|---------|
| `MEMBERSHIP_NOT_FOUND` (NEW) | `findByPk(membershipId)` returns null | `updateClubPlayerMembership`, `removePlayerFromClub` |

Existing codes reused (no changes): `PERMISSION_DENIED`, `CLUB_NOT_FOUND`, `PLAYER_NOT_FOUND`.

## State transitions

### addPlayerToClub (idempotent)

```
INPUT: { clubId, playerId, start, end?, membershipType? }
  ↓ auth check (PERMISSION_DENIED if fails)
  ↓ Club.findByPk → null? → CLUB_NOT_FOUND
  ↓ Player.findByPk → null? → PLAYER_NOT_FOUND
  ↓ ClubPlayerMembership.findOrCreate({ where: { clubId, playerId, start }, defaults: { end, membershipType, confirmed } })
  ↓ → returns [instance, created]
  ↓
RESULT: AddPlayerToClubResult { ...instance, alreadyExisted: !created }
```

### updateClubPlayerMembership

```
INPUT: { id, ...fields }
  ↓ ClubPlayerMembership.findByPk(id) → null? → MEMBERSHIP_NOT_FOUND
  ↓ auth check on membership.clubId → PERMISSION_DENIED if fails
  ↓ membership.update(fields, { transaction })
  ↓
RESULT: Boolean (unchanged)
```

### removePlayerFromClub

```
INPUT: { id }
  ↓ ClubPlayerMembership.findByPk(id) → null? → MEMBERSHIP_NOT_FOUND
  ↓ auth check on membership.clubId → PERMISSION_DENIED if fails
  ↓ membership.destroy({ transaction })
  ↓
RESULT: Boolean (unchanged)
```

Note: `update` and `remove` keep their `Boolean` return shape. Only `addPlayerToClub` gets the new result object — that's what BAD-129 requires and what aligns with idempotent-create pattern. Update/remove are not idempotent-create operations.
