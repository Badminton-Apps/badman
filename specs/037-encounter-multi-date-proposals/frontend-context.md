# Frontend Implementation Context: Encounter Multi-Date Proposals

**Feature**: `feat/037-encounter-multi-date-proposals`
**Backend branch**: `feat/037-encounter-multi-date-proposals` (committed, ready)
**Date**: 2026-06-18

---

## Files to Touch

- `components/encounters/ChangeEncounter/components/Proposals.tsx` — away tentative-accept / reject-per-date / counter UI; home finalize UI; per-date validation symbols (BAD-82)
- `components/encounters/calendars/ChangeEncounterCalendar/components/DayDetailDrawer/DayDetailDrawer.tsx` — buffer multiple dates before submit; home-venue availability check
- `components/encounters/ChangeEncounter/components/Messages.tsx` — chat-message notification trigger
- `context/ChangeEncounterContext.tsx`
- `graphql/encounters/mutations.gql`, `queries.gql`, regenerated `__generated__/types.ts` (query the new `changeStatus` field)
- club encounters table columns — render the derived status column from the backend `changeStatus` key (BAD-238)
- **i18n message catalog** (`next-intl`, namespace `ETranslations.ChangeEncounter`) — new `status.proposalSent` / `status.actionRequired` / `status.rejectedWaiting` / `status.moved` label keys (§8.1)

---

## GraphQL Changes

### New Mutations

```graphql
mutation ProposeEncounterChangeDates($input: ProposeEncounterChangeDatesInput!) {
  proposeEncounterChangeDates(input: $input) {
    encounterChange {
      id
      lastActionBy
      lastActionAt
      dates {
        id
        date
        status
        proposedBy
        locationId
      }
    }
  }
}

mutation TriageEncounterChange($input: TriageEncounterChangeInput!) {
  triageEncounterChange(input: $input) {
    encounterChange {
      id
      lastActionBy
      lastActionAt
      dates {
        id
        date
        status
        proposedBy
        locationId
      }
    }
  }
}

mutation FinalizeEncounterChange($input: FinalizeEncounterChangeInput!) {
  finalizeEncounterChange(input: $input) {
    encounter {
      id
      date
      locationId
    }
    encounterChange {
      id
      dates {
        id
        date
        status
      }
    }
  }
}
```

### Input Types

```typescript
// Either party can propose
ProposeEncounterChangeDatesInput {
  encounterId: string
  dates: { date: Date; locationId?: string }[]
}

// AWAY only — single call covers endorse + reject + counter in one transaction
TriageEncounterChangeInput {
  encounterChangeId: string
  endorseIds?: string[]                          // PENDING → TENTATIVELY_ACCEPTED
  rejectIds?: string[]                           // PENDING | TENTATIVELY_ACCEPTED → REJECTED
  newDates?: { date: Date; locationId?: string }[] // new AWAY counter-proposals → PENDING
}

// HOME only
FinalizeEncounterChangeInput {
  encounterChangeDateId: string  // must be TENTATIVELY_ACCEPTED or proposedBy=AWAY
}
```

### New Field on EncounterCompetition

Add `changeStatus` to any encounter query/fragment where the status badge is shown:

```graphql
query Encounters {
  encounterCompetitions {
    id
    date
    changeStatus # nullable String — per-viewer, computed server-side
  }
}
```

### New Fields on EncounterChangeDate

Add `status` and `proposedBy` to the date fragment:

```graphql
{
  id
  date
  status # PENDING | TENTATIVELY_ACCEPTED | ACCEPTED | REJECTED | RESOLVED
  proposedBy # HOME | AWAY
  locationId
  availabilityHome # POSSIBLE | NOT_POSSIBLE | null
  availabilityAway # POSSIBLE | NOT_POSSIBLE | null
}
```

### Deprecated

`addChangeEncounter` is still functional but deprecated — migrate callers to the three new mutations above.

---

## New Enums (available in `__generated__/types.ts` after codegen)

```typescript
enum ChangeEncounterDateStatus {
  PENDING = "PENDING",
  TENTATIVELY_ACCEPTED = "TENTATIVELY_ACCEPTED",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  RESOLVED = "RESOLVED",
}

enum ChangeEncounterParty {
  HOME = "HOME",
  AWAY = "AWAY",
}

enum EncounterChangeViewState {
  PROPOSAL_SENT = "PROPOSAL_SENT",
  ACTION_REQUIRED = "ACTION_REQUIRED",
  REJECTED_WAITING = "REJECTED_WAITING",
  MOVED = "MOVED",
}
```

---

## `changeStatus` — What to Render

The backend computes this per-viewer based on the user's club permission. The frontend renders it, no derivation needed.

| Value              | Who sees it                         | Meaning                                               | UI                  |
| ------------------ | ----------------------------------- | ----------------------------------------------------- | ------------------- |
| `PROPOSAL_SENT`    | The party that last acted           | You sent proposals, waiting for response              | Neutral badge       |
| `ACTION_REQUIRED`  | The party that needs to act next    | Your turn to respond                                  | Highlighted badge   |
| `REJECTED_WAITING` | The party that was rejected         | Other party rejected, waiting for their new proposals | Muted badge         |
| `MOVED`            | Both parties                        | A date was finalized, encounter moved                 | Success badge       |
| `null`             | Non-participants / no active change | User is not a party, or no change request exists      | Hide badge entirely |

### i18n Keys

Namespace: `ETranslations.ChangeEncounter`

```
status.proposalSent    → "Proposal sent"
status.actionRequired  → "Action required"
status.rejectedWaiting → "Waiting for response"
status.moved           → "Moved"
```

---

## Date Status — What to Show in Proposals UI

```
PENDING              → proposed, not yet acted on — show endorse/reject controls (AWAY view)
TENTATIVELY_ACCEPTED → away endorsed — show finalize button (HOME view)
ACCEPTED             → finalized — show as confirmed, read-only
REJECTED             → explicitly rejected — show as struck-through / historical
RESOLVED             → a sibling was accepted — show as greyed-out / historical
```

**Live dates** (actionable): `PENDING`, `TENTATIVELY_ACCEPTED`
**Terminal dates** (read-only): `ACCEPTED`, `REJECTED`, `RESOLVED`

### State Flow

```
[HOME/AWAY proposes]    → PENDING
[AWAY endorses]         → TENTATIVELY_ACCEPTED
[HOME finalizes]        → ACCEPTED  (siblings → RESOLVED)
[Either rejects]        → REJECTED
[Sibling finalized]     → RESOLVED
```

---

## Per-File Notes

### `graphql/encounters/mutations.gql` + `queries.gql`

- Add the 3 new mutations
- Add `changeStatus` to encounter query fragments
- Add `status`, `proposedBy` to `EncounterChangeDate` fragment
- Run codegen to regenerate `__generated__/types.ts`

### `context/ChangeEncounterContext.tsx`

- Replace single-date selection state with an array of proposed dates
- Track `encounterChangeId` for triage calls
- Buffer endorse/reject selections locally before submitting a single `triageEncounterChange` call

### `Proposals.tsx`

- **AWAY view**:
  - Render each `PENDING` date with endorse / reject toggle buttons
  - Render `TENTATIVELY_ACCEPTED` dates as already endorsed (read-only or de-endorsable via rejectIds)
  - Batch all selections into a single `triageEncounterChange` call on submit
  - Allow adding counter-dates (`newDates`) in the same triage call
- **HOME view**:
  - Render `TENTATIVELY_ACCEPTED` dates with a "Finalize" button → `finalizeEncounterChange`
  - Render `PENDING` dates with `proposedBy=AWAY` with a "Finalize" button too (away-proposed are also finalizable)
  - `PENDING` dates with `proposedBy=HOME` are read-only (your own proposals, waiting)
- **Both views**:
  - Show `availabilityHome` / `availabilityAway` symbols per date row (`POSSIBLE` / `NOT_POSSIBLE`)
  - Terminal dates (`REJECTED`, `RESOLVED`, `ACCEPTED`) shown as historical / read-only

### `DayDetailDrawer.tsx`

- Buffer selected dates locally before calling `proposeEncounterChangeDates` (supports multi-date proposals in one call)
- Check `availabilityHome` on the selected date — warn user before proposing a venue-conflicted slot

### `Messages.tsx`

- Notifications are sent server-side on each mutation — no client-side changes needed unless you're adding optimistic chat messages

### Club encounters table (BAD-238)

- Query `changeStatus` on each encounter row
- Render status pill per the table above
- Hide pill entirely when `changeStatus` is `null`

---

## Error Codes

All errors come back as `GraphQLError` with `extensions.code`. Handle these in mutation `onError` callbacks:

| `extensions.code`                 | Trigger                                                        | Suggested UX                  |
| --------------------------------- | -------------------------------------------------------------- | ----------------------------- |
| `PERMISSION_DENIED`               | Wrong party calling triage or finalize                         | Toast error                   |
| `DEADLINE_PASSED`                 | Proposing after the change request close date                  | Inline warning on calendar    |
| `DATE_OUT_OF_SEASON`              | Date outside Sep 1 – Apr 30 of the competition season          | Inline warning on date picker |
| `DUPLICATE_DATE`                  | Same date already proposed and not rejected                    | Inline warning                |
| `INVALID_STATE`                   | Endorsing/rejecting a date in the wrong state                  | Refresh list + toast          |
| `DATE_NOT_ENDORSED`               | Finalizing a PENDING home-proposed date (not endorsed by away) | Refresh list + toast          |
| `VALIDATION_FAILED`               | LocationRule conflict on finalize (venue already taken)        | Show validation errors inline |
| `ENCOUNTER_NOT_FOUND`             | encounterId does not exist                                     | Toast error                   |
| `ENCOUNTER_CHANGE_NOT_FOUND`      | encounterChangeId does not exist                               | Toast error                   |
| `ENCOUNTER_CHANGE_DATE_NOT_FOUND` | encounterChangeDateId does not exist                           | Toast error                   |
