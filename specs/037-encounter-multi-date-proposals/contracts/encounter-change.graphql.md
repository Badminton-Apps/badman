# GraphQL Contract: Encounter Change Mutations & Types

**Feature**: `037-encounter-multi-date-proposals`
**Files**:

- `packages/backend-graphql/src/resolvers/event/competition/encounter-change.resolver.ts`
- `packages/backend-graphql/src/resolvers/event/competition/encounter.resolver.ts`

---

## Schema (after this feature)

Equivalent SDL view of the code-first definitions:

```graphql
# --- Enums ---

enum ChangeEncounterParty {
  HOME
  AWAY
}

enum ChangeEncounterDateStatus {
  PENDING
  TENTATIVELY_ACCEPTED
  ACCEPTED
  REJECTED
  RESOLVED
}

# --- Modified types ---

type EncounterChange {
  id: ID!
  encounterId: ID
  # removed: accepted: Boolean
  lastActionBy: String!        # ChangeEncounterParty value
  lastActionAt: DateTime!
  dates: [EncounterChangeDate]
  createdAt: DateTime
  updatedAt: DateTime
}

type EncounterChangeDate {
  id: ID!
  encounterChangeId: ID
  date: DateTime
  locationId: ID
  location: Location
  availabilityHome: String     # POSSIBLE | NOT_POSSIBLE (computed at read, not stored)
  availabilityAway: String
  # removed: selected: Boolean
  proposedBy: String!          # ChangeEncounterParty value
  status: String!              # ChangeEncounterDateStatus value
  createdAt: DateTime
  updatedAt: DateTime
}

extend type EncounterCompetition {
  """
  Per-viewer derived status. Null when no active change request exists.
  Values: PROPOSAL_SENT | ACTION_REQUIRED | REJECTED_WAITING | MOVED
  """
  changeStatus: String
}

# --- Inputs ---

input ProposedDateInput {
  date: DateTime!
  locationId: ID
}

input ProposeEncounterChangeDatesInput {
  encounterId: ID!
  dates: [ProposedDateInput!]!
}

input TriageEncounterChangeInput {
  encounterChangeId: ID!
  endorseIds: [ID!]              # PENDING → TENTATIVELY_ACCEPTED
  rejectIds: [ID!]               # PENDING | TENTATIVELY_ACCEPTED → REJECTED
  newDates: [ProposedDateInput!] # new AWAY-proposed dates
}

input FinalizeEncounterChangeInput {
  encounterChangeDateId: ID!     # must be TENTATIVELY_ACCEPTED or proposedBy=AWAY
}

# --- Result types ---

type ProposeEncounterChangeDatesResult {
  encounterChange: EncounterChange!
}

type TriageEncounterChangeResult {
  encounterChange: EncounterChange!
}

type FinalizeEncounterChangeResult {
  encounter: EncounterCompetition!
  encounterChange: EncounterChange!
}

# --- Mutations ---

extend type Mutation {
  """
  Append one or more candidate dates to the encounter's change request.
  Either party (HOME or AWAY) with change:encounter permission may call this.
  Dates are appended; existing dates in other states are never removed.
  """
  proposeEncounterChangeDates(
    input: ProposeEncounterChangeDatesInput!
  ): ProposeEncounterChangeDatesResult!

  """
  Away team submits a combined triage: endorse dates, reject dates, and/or
  add counter-offer dates — all in one atomic action.
  Only the AWAY party may call this.
  """
  triageEncounterChange(
    input: TriageEncounterChangeInput!
  ): TriageEncounterChangeResult!

  """
  Home team selects one endorsed date to officially move the encounter.
  Only the HOME party may call this. Runs full validation before writing.
  """
  finalizeEncounterChange(
    input: FinalizeEncounterChangeInput!
  ): FinalizeEncounterChangeResult!

  """
  @deprecated — use proposeEncounterChangeDates / triageEncounterChange /
  finalizeEncounterChange. Kept during frontend migration.
  """
  addChangeEncounter(...): EncounterChange
}
```

---

## Breaking Changes

| Field                               | Old       | New                       |
| ----------------------------------- | --------- | ------------------------- |
| `EncounterChange.accepted`          | `Boolean` | **Removed**               |
| `EncounterChangeDate.selected`      | `Boolean` | **Removed**               |
| `EncounterChange.lastActionBy`      | missing   | `String!` (added)         |
| `EncounterChange.lastActionAt`      | missing   | `DateTime!` (added)       |
| `EncounterChangeDate.proposedBy`    | missing   | `String!` (added)         |
| `EncounterChangeDate.status`        | missing   | `String!` (added)         |
| `EncounterCompetition.changeStatus` | missing   | `String` (added, derived) |

Frontend must drop reads of `accepted`/`selected` and adopt `status`/`lastActionBy`.

---

## `proposeEncounterChangeDates` Behavior

1. Resolve actor party — HOME if `user.hasAnyPermission([homeClubId + '_change:encounter'])`, else AWAY
2. Reject if `event.changeCloseRequestDatePeriodN` has passed → `DEADLINE_PASSED`
3. Reject any date outside Sep 1 – Apr 30 of the competition season → `DATE_OUT_OF_SEASON`
4. Reject dates already present in a non-REJECTED status → `DUPLICATE_DATE`
5. INSERT `EncounterChangeDate` rows: `status=PENDING`, `proposedBy=<party>`
6. UPDATE `EncounterChange.lastActionBy/lastActionAt`
7. Notify opposing team captain (single notification)

## `triageEncounterChange` Behavior

1. Verify actor is AWAY party — else `PERMISSION_DENIED`
2. Load `EncounterChange` + dates
3. In transaction:
   - `endorseIds` → `TENTATIVELY_ACCEPTED` (source must be `PENDING`)
   - `rejectIds` → `REJECTED` (source must be `PENDING` or `TENTATIVELY_ACCEPTED`)
   - `newDates` → INSERT with `status=PENDING`, `proposedBy=AWAY`
   - UPDATE `lastActionBy=AWAY`, `lastActionAt=NOW()`
4. Single notification to home team captain

## `finalizeEncounterChange` Behavior

1. Verify actor is HOME party — else `PERMISSION_DENIED`
2. Load date — must be `TENTATIVELY_ACCEPTED` or `proposedBy=AWAY` — else `DATE_NOT_ENDORSED`
3. Run `EncounterValidationService.validate()` — LocationRule active (Option A: original slot still occupied)
4. In transaction:
   - Selected date → `ACCEPTED`
   - All sibling `PENDING`/`TENTATIVELY_ACCEPTED` → `RESOLVED`; `REJECTED` siblings unchanged
   - `encounter.date = proposedDate`
   - Set `encounter.originalDate` if not already set
   - Update `encounter.locationId` if date carries one
   - Enqueue sync job
5. Notify both parties

## `changeStatus` Derivation

```
viewer_party = HOME if user.hasAnyPermission([homeClubId + '_change:encounter'])
             = AWAY otherwise

1. No EncounterChange → null
2. Any date ACCEPTED → MOVED
3. Live dates exist (PENDING or TENTATIVELY_ACCEPTED):
     lastActionBy === viewer_party → PROPOSAL_SENT
     lastActionBy !== viewer_party → ACTION_REQUIRED
4. All dates REJECTED:
     lastActionBy === viewer_party → ACTION_REQUIRED  (they owe new dates)
     lastActionBy !== viewer_party → REJECTED_WAITING
```

---

## Error Codes

All errors use `GraphQLError` with `extensions.code` from `packages/backend-graphql/src/utils/error-codes.ts`.

| Code                 | Mutations        | Condition                                                        |
| -------------------- | ---------------- | ---------------------------------------------------------------- |
| `PERMISSION_DENIED`  | all              | Missing `change:encounter` or wrong party (home/away constraint) |
| `NOT_FOUND`          | triage, finalize | `encounterChangeId` or `encounterChangeDateId` does not exist    |
| `DEADLINE_PASSED`    | propose          | Change request window has closed                                 |
| `DATE_OUT_OF_SEASON` | propose, triage  | Date outside Sep 1 – Apr 30                                      |
| `DUPLICATE_DATE`     | propose          | Date already exists in non-REJECTED status                       |
| `INVALID_STATE`      | triage           | Endorsing/rejecting a date not in a valid source status          |
| `DATE_NOT_ENDORSED`  | finalize         | Date is `PENDING` — not yet endorsed by away team                |
| `VALIDATION_FAILED`  | finalize         | Location conflict, capacity, or other rule violation             |
| `INTERNAL_ERROR`     | all              | Unexpected error; internal details must not leak                 |

---

## Sample Requests

### Propose dates

```graphql
mutation {
  proposeEncounterChangeDates(
    input: {
      encounterId: "abc123"
      dates: [{ date: "2026-11-15T14:00:00Z" }, { date: "2026-11-22T14:00:00Z" }]
    }
  ) {
    encounterChange {
      id
      lastActionBy
      dates {
        id
        date
        status
        proposedBy
      }
    }
  }
}
```

### Triage (away)

```graphql
mutation {
  triageEncounterChange(
    input: {
      encounterChangeId: "ec1"
      endorseIds: ["date1"]
      rejectIds: ["date2"]
      newDates: [{ date: "2026-12-06T14:00:00Z" }]
    }
  ) {
    encounterChange {
      lastActionBy
      dates {
        id
        date
        status
        proposedBy
      }
    }
  }
}
```

### Finalize (home)

```graphql
mutation {
  finalizeEncounterChange(input: { encounterChangeDateId: "date1" }) {
    encounter {
      id
      date
    }
    encounterChange {
      dates {
        id
        status
      }
    }
  }
}
```

### Error — wrong party

```json
{
  "data": null,
  "errors": [
    {
      "message": "Only the away team may triage this change request.",
      "extensions": { "code": "PERMISSION_DENIED" }
    }
  ]
}
```
