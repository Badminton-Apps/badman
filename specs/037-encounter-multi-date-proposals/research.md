# Research: Encounter Multi-Date Proposals & Counter-Offer Flow

## Decision 1: Enum column storage in Sequelize

**Decision**: Use inline `DataType.ENUM(...values)` — pass string literals matching the TypeScript enum values.

**Rationale**: This is the established pattern across all existing models (`ChangeEncounterAvailability`, `SecurityType`, team day-of-week, ranking system fields). No deviation needed.

**Pattern**:

```ts
@Column(DataType.ENUM(...Object.values(ChangeEncounterParty)))
proposedBy!: ChangeEncounterParty;
```

---

## Decision 2: Per-viewer `changeStatus` resolve field

**Decision**: Add `@ResolveField(() => String, { nullable: true })` named `changeStatus` to `EncounterCompetitionResolver` in `encounter.resolver.ts`. Uses `@Parent()` encounter + `@User()` user.

**Party resolution**: Use `user.hasAnyPermission([homeTeam.clubId + '_change:encounter'])` to determine HOME/AWAY — reuses the existing permission check already done for mutations, no extra DB query needed when `home`/`away` associations are already loaded via `@ResolveField` lazy loading.

**Status derivation logic** (server-side, matches spec §8):

```
if (no EncounterChange) → null
if (any date ACCEPTED) → MOVED
if (live dates exist):
  lastActionBy === viewer's party → PROPOSAL_SENT
  lastActionBy !== viewer's party → ACTION_REQUIRED
if (all dates REJECTED, none live):
  lastActionBy === viewer's party → ACTION_REQUIRED  (they rejected → they owe new dates)
  lastActionBy !== viewer's party → REJECTED_WAITING
```

---

## Decision 3: Three clean mutations replacing `addChangeEncounter`

**Decision**: Split the current monolithic `addChangeEncounter` into three focused mutations:

| New mutation                  | Who            | Replaces                                                              |
| ----------------------------- | -------------- | --------------------------------------------------------------------- |
| `proposeEncounterChangeDates` | Either party   | The "not accepted" path of `addChangeEncounter` — appending new dates |
| `triageEncounterChange`       | Away team only | New — combined endorse/reject/counter in one action                   |
| `finalizeEncounterChange`     | Home team only | The `accepted: true` path of `addChangeEncounter`                     |

`addChangeEncounter` is **deprecated** but kept briefly during migration to avoid breaking the frontend before it adopts the new mutations.

**Rationale**: Single-purpose mutations are testable in isolation, enforce party constraints at the resolver level, and avoid the `accepted` boolean ambiguity.

---

## Decision 4: `LocationRule` activation strategy (Option A)

**Decision**: Activate `LocationRule` in `EncounterValidationService` and call `encounterService.validate()` in `finalizeEncounterChange` before writing `encounter.date`. The original slot stays occupied (Option A from spec) — `EncounterCompetition.date` is only updated on successful finalization.

**Implementation**: `LocationRule` is already registered but `activated: false`. Change to `activated: true`. The rule checks whether the location is free on the proposed date by querying existing encounters at that location — since the original encounter's date is unchanged until finalization, it correctly appears occupied.

---

## Decision 5: Migration backfill order

**Decision**: Single migration file with:

1. Add columns (nullable): `EncounterChange.lastActionBy`, `EncounterChange.lastActionAt`, `EncounterChangeDate.proposedBy`, `EncounterChangeDate.status`
2. Backfill `proposedBy`: `availabilityAway IS NULL → 'HOME'`, else `'AWAY'`
3. Backfill `status`: find dates where their parent `EncounterChange.accepted = true` — the date matching `selected = true` → `'ACCEPTED'`, its siblings → `'RESOLVED'`, all other dates → `'PENDING'`
4. Backfill `lastActionBy` / `lastActionAt`: from the most recent `EncounterChangeDate.proposedBy` / `createdAt` per group
5. Add NOT NULL constraints after backfill
6. Drop `EncounterChange.accepted` and `EncounterChangeDate.selected`

**`down` migration**: Restore `accepted`/`selected` from `status` (`ACCEPTED` → `selected=true`, `accepted=true`), then drop new columns.

---

## Decision 6: Notification recipients

**Decision**: Notify the team captain (`team.captainId`) of the opposing team. No fallback needed — captains are always granted the `change:encounter` permission.

**Rationale**: Captain is the designated scheduling contact and will always hold the permission. Consistent with how the existing `notificationService.notifyEncounterChange` call works.
