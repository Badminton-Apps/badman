# Contract: ranking lookup (`@badman/backend-database`)

```ts
findLatestRankingPlaces(options: {
  playerIds: string[];
  systemId: string;               // required: every lookup names its system (FR-014)
  onOrBefore: CalendarDate;       // inclusive
  onOrAfter?: CalendarDate;       // inclusive; used by the line-up check window
  updatePossibleOnly?: boolean;   // default false
  transaction?: Transaction;
}): Promise<Map<string, LatestRankingPlace>>

type LatestRankingPlace = {
  id: string;
  playerId: string;
  rankingDate: Date;
  single: number | null;
  double: number | null;
  mix: number | null;
  updatePossible: boolean;
};
```

**Behaviour**

- Returns at most one place per player: the newest `rankingDate` in the range, for the given system, optionally only update publications.
- Calendar dates become instants with `brusselsDayRange` (research R3): `rankingDate >= start of onOrAfter in Brussels` and `rankingDate < start of the day after onOrBefore in Brussels`. That is today's production window; the bounds are passed as UTC text so SQLite compares them correctly (research R6).
- Players without a matching place are absent from the map. Callers keep their current fallback (system maximum, 12, or `amountOfLevels + 2`).
- Empty `playerIds` returns an empty map without a query.
- Works on Postgres and SQLite (`ROW_NUMBER()` window function, research R6).

**Callers and the rule each passes (FR-013)**

| Caller | `onOrBefore` | `onOrAfter` | `updatePossibleOnly` |
| --- | --- | --- | --- |
| Enrollment team index | `enrollmentRankingDate(season)` | — | false |
| Line-up export | `enrollmentRankingDate(season)` | — | true |
| Line-up check | `lineUpRankingWindow(event).to` | `lineUpRankingWindow(event).from` | true |
| Sync worker entries | `enrollmentRankingDate(team.season)` | — | false, now with the primary ranking system's id (FR-014; changes the BAD-409 "any ranking system" test on purpose) |

The BAD-409 integration tests (`*.integration.spec.ts`) must return the same places before and after, except the sync worker's system filter.
