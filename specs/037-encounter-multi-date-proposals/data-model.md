# Data Model: Encounter Multi-Date Proposals & Counter-Offer Flow

**Feature**: `feat/037-encounter-multi-date-proposals`
**Date**: 2026-06-18

---

## New Enums (`packages/utils/src/lib/enums/`)

### `ChangeEncounterParty`

File: `changeEncounterParty.enum.ts`

```typescript
export enum ChangeEncounterParty {
  HOME = "HOME",
  AWAY = "AWAY",
}
```

Used on: `EncounterChange.lastActionBy`, `EncounterChangeDate.proposedBy`

---

### `ChangeEncounterDateStatus`

File: `changeEncounterDateStatus.enum.ts`

```typescript
export enum ChangeEncounterDateStatus {
  PENDING = "PENDING",
  TENTATIVELY_ACCEPTED = "TENTATIVELY_ACCEPTED",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  RESOLVED = "RESOLVED",
}
```

**State machine:**

```
PENDING ──────────────────► TENTATIVELY_ACCEPTED ──────► ACCEPTED (terminal, one per change)
   │                              │                            │
   │ (reject)                     │ (reject)                   │ (sibling finalized)
   ▼                              ▼                            ▼
REJECTED (terminal)          REJECTED (terminal)          RESOLVED (terminal, siblings)
   │
   │ (sibling finalized)
   ▼
RESOLVED (terminal — for PENDING siblings on finalization)
```

- `PENDING` — newly proposed, not yet acted on by the other party
- `TENTATIVELY_ACCEPTED` — away team has endorsed this date
- `ACCEPTED` — finalized by home team; encounter moves to this date (at most one per change)
- `REJECTED` — explicitly rejected; terminal
- `RESOLVED` — sibling date was accepted/finalized; this date is no longer needed

Used on: `EncounterChangeDate.status`

---

### `EncounterChangeViewState`

File: `encounterChangeViewState.enum.ts`

```typescript
export enum EncounterChangeViewState {
  PROPOSAL_SENT = "PROPOSAL_SENT",
  ACTION_REQUIRED = "ACTION_REQUIRED",
  REJECTED_WAITING = "REJECTED_WAITING",
  MOVED = "MOVED",
}
```

Used for: `EncounterCompetition.changeStatus` derive field (never stored)

---

## Modified Models

### `EncounterChange` (`event."EncounterChanges"`)

Schema: `event`

| Field          | Type                         | Change      | Notes                         |
| -------------- | ---------------------------- | ----------- | ----------------------------- |
| `id`           | UUID                         | unchanged   | PK                            |
| `encounterId`  | UUID FK                      | unchanged   | → `EncounterCompetition`      |
| `accepted`     | BOOLEAN                      | **REMOVED** | replaced by `status` on dates |
| `lastActionBy` | ENUM(`ChangeEncounterParty`) | **ADDED**   | NOT NULL after backfill       |
| `lastActionAt` | TIMESTAMPTZ                  | **ADDED**   | NOT NULL after backfill       |
| `createdAt`    | TIMESTAMPTZ                  | unchanged   |                               |
| `updatedAt`    | TIMESTAMPTZ                  | unchanged   |                               |

**Sequelize model diff:**

```typescript
// REMOVE:
@Field(() => Boolean)
@Default(false)
@Column(DataType.BOOLEAN)
accepted?: boolean;

// ADD:
@Field(() => String)
@Column(DataType.ENUM(...Object.values(ChangeEncounterParty)))
lastActionBy!: ChangeEncounterParty;

@Field(() => Date)
@Column(DataType.DATE)
lastActionAt!: Date;
```

---

### `EncounterChangeDate` (`event."EncounterChangeDates"`)

Schema: `event`

| Field               | Type                              | Change      | Notes                                      |
| ------------------- | --------------------------------- | ----------- | ------------------------------------------ |
| `id`                | UUID                              | unchanged   | PK                                         |
| `encounterChangeId` | UUID FK                           | unchanged   | → `EncounterChange`                        |
| `date`              | TIMESTAMPTZ                       | unchanged   | proposed date value                        |
| `locationId`        | UUID FK                           | unchanged   | optional, → `Location`                     |
| `availabilityHome`  | ENUM                              | unchanged   | computed at read time, not stored (FR-025) |
| `availabilityAway`  | ENUM                              | unchanged   |                                            |
| `selected`          | BOOLEAN                           | **REMOVED** | replaced by `status`                       |
| `proposedBy`        | ENUM(`ChangeEncounterParty`)      | **ADDED**   | NOT NULL after backfill                    |
| `status`            | ENUM(`ChangeEncounterDateStatus`) | **ADDED**   | NOT NULL after backfill                    |
| `createdAt`         | TIMESTAMPTZ                       | unchanged   |                                            |
| `updatedAt`         | TIMESTAMPTZ                       | unchanged   |                                            |

**Sequelize model diff:**

```typescript
// REMOVE:
@Field(() => Boolean, { nullable: true })
@Column(DataType.BOOLEAN)
selected?: boolean;

// ADD:
@Field(() => String)
@Column(DataType.ENUM(...Object.values(ChangeEncounterParty)))
proposedBy!: ChangeEncounterParty;

@Field(() => String)
@Column(DataType.ENUM(...Object.values(ChangeEncounterDateStatus)))
status!: ChangeEncounterDateStatus;
```

---

### `EncounterCompetition` (schema: `event`)

No schema change. Gains a derived GraphQL-only field:

```typescript
// In EncounterCompetitionResolver (NOT on the model):
@ResolveField(() => String, { nullable: true })
async changeStatus(
  @Parent() encounter: EncounterCompetition,
  @User() user: Player,
): Promise<EncounterChangeViewState | null>
```

---

## Input Types (new)

### `ProposeEncounterChangeDatesInput`

```typescript
@InputType()
export class ProposeEncounterChangeDatesInput {
  @Field(() => ID)
  encounterId!: string;

  @Field(() => [ProposedDateInput])
  dates!: ProposedDateInput[];
}

@InputType()
export class ProposedDateInput {
  @Field(() => Date)
  date!: Date;

  @Field(() => ID, { nullable: true })
  locationId?: string;
}
```

### `TriageEncounterChangeInput`

```typescript
@InputType()
export class TriageEncounterChangeInput {
  @Field(() => ID)
  encounterChangeId!: string;

  @Field(() => [ID], { nullable: true })
  endorseIds?: string[]; // PENDING → TENTATIVELY_ACCEPTED

  @Field(() => [ID], { nullable: true })
  rejectIds?: string[]; // PENDING or TENTATIVELY_ACCEPTED → REJECTED

  @Field(() => [ProposedDateInput], { nullable: true })
  newDates?: ProposedDateInput[]; // new AWAY-proposed dates
}
```

### `FinalizeEncounterChangeInput`

```typescript
@InputType()
export class FinalizeEncounterChangeInput {
  @Field(() => ID)
  encounterChangeDateId!: string; // must be TENTATIVELY_ACCEPTED or proposedBy=AWAY
}
```

---

## Migration

File: `database/migrations/YYYYMMDD-add-encounter-change-multi-date.js`

### Up

```sql
-- Step 1: Add nullable columns
ALTER TABLE event."EncounterChanges"
  ADD COLUMN "lastActionBy" VARCHAR,
  ADD COLUMN "lastActionAt" TIMESTAMPTZ;

ALTER TABLE event."EncounterChangeDates"
  ADD COLUMN "proposedBy" VARCHAR,
  ADD COLUMN "status"     VARCHAR;

-- Step 2: Backfill proposedBy
-- availabilityAway IS NULL = proposed by HOME (null trick)
UPDATE event."EncounterChangeDates"
SET "proposedBy" = CASE
  WHEN "availabilityAway" IS NULL THEN 'HOME'
  ELSE 'AWAY'
END;

-- Step 3: Backfill status
-- Accepted dates → ACCEPTED, their siblings → RESOLVED, rest → PENDING
WITH accepted_changes AS (
  SELECT id FROM event."EncounterChanges" WHERE accepted = true
),
accepted_dates AS (
  SELECT d.id AS date_id, d."encounterChangeId"
  FROM event."EncounterChangeDates" d
  INNER JOIN accepted_changes ac ON d."encounterChangeId" = ac.id
  WHERE d.selected = true
)
UPDATE event."EncounterChangeDates" d
SET "status" = CASE
  WHEN ad.date_id IS NOT NULL THEN 'ACCEPTED'
  WHEN d."encounterChangeId" IN (SELECT "encounterChangeId" FROM accepted_dates)
    AND d.selected IS NOT true THEN 'RESOLVED'
  ELSE 'PENDING'
END
FROM (SELECT * FROM accepted_dates) ad
WHERE ad.date_id = d.id
   OR d."encounterChangeId" IN (SELECT "encounterChangeId" FROM accepted_dates)
   OR TRUE;

-- (simplified; actual migration uses subquery structure per Sequelize queryInterface)

-- Step 4: Backfill lastActionBy / lastActionAt from most recent date per change
UPDATE event."EncounterChanges" ec
SET
  "lastActionBy" = latest.proposedby,
  "lastActionAt" = latest.createdat
FROM (
  SELECT DISTINCT ON ("encounterChangeId")
    "encounterChangeId",
    "proposedBy" AS proposedby,
    "createdAt"  AS createdat
  FROM event."EncounterChangeDates"
  ORDER BY "encounterChangeId", "createdAt" DESC
) AS latest
WHERE ec.id = latest."encounterChangeId";

-- Step 5: Add NOT NULL constraints
ALTER TABLE event."EncounterChanges"
  ALTER COLUMN "lastActionBy" SET NOT NULL,
  ALTER COLUMN "lastActionAt" SET NOT NULL;

ALTER TABLE event."EncounterChangeDates"
  ALTER COLUMN "proposedBy" SET NOT NULL,
  ALTER COLUMN "status"     SET NOT NULL;

-- Step 6: Drop legacy columns
ALTER TABLE event."EncounterChanges"   DROP COLUMN accepted;
ALTER TABLE event."EncounterChangeDates" DROP COLUMN selected;
```

### Down

```sql
-- Restore legacy columns
ALTER TABLE event."EncounterChanges"
  ADD COLUMN accepted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE event."EncounterChangeDates"
  ADD COLUMN selected BOOLEAN;

-- Restore accepted from status
UPDATE event."EncounterChanges" ec
SET accepted = true
WHERE EXISTS (
  SELECT 1 FROM event."EncounterChangeDates" d
  WHERE d."encounterChangeId" = ec.id AND d.status = 'ACCEPTED'
);

-- Restore selected from status
UPDATE event."EncounterChangeDates"
SET selected = true
WHERE status = 'ACCEPTED';

-- Drop new columns
ALTER TABLE event."EncounterChanges"
  DROP COLUMN "lastActionBy",
  DROP COLUMN "lastActionAt";

ALTER TABLE event."EncounterChangeDates"
  DROP COLUMN "proposedBy",
  DROP COLUMN "status";
```

---

## Uniqueness / Validation Rules

- **One active `EncounterChange` per encounter** (FR-001): enforced by resolver logic — `findOrCreate` by `encounterId`.
- **No duplicate dates** (spec edge case): deduplication check before insert — reject if a date with same value already exists in non-REJECTED status for the same change.
- **Season bounds** (FR-007): Sep 1 – Apr 30 of the competition season; validated before insert and before finalization.
- **Finalization eligibility** (FR-012): `status === TENTATIVELY_ACCEPTED` OR `proposedBy === AWAY` — checked in resolver before validation runs.
