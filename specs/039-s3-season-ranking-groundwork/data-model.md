# Data Model: Season and Ranking Reference-Date Groundwork

**Feature**: 039-s3-season-ranking-groundwork | **Date**: 2026-11-19

No tables, columns or migrations change, and the GraphQL schema stays the same (FR-017). This document describes the value types the new code introduces and the existing fields it reads.

## Value types (new, in `@badman/utils`)

| Type | Shape | Meaning |
| --- | --- | --- |
| `Season` | `number` | The year a season starts in: 2026 is 2026–27. |
| `CalendarDate` | `` `${number}-${number}-${number}` ``, `YYYY-MM-DD` | A date on the Belgian calendar, without time or timezone. All reference dates use this type. The template literal type rejects formats like `10/06/2026` or an ISO instant at compile time; `parseCalendarDate` checks the value at run time. |
| `CalendarRange` | `{ from: CalendarDate; to: CalendarDate }` | Inclusive on both ends. |
| `SeasonHalf` | `"first" \| "second"` | First half: calendar year = season. Second half: calendar year = season + 1 (includes May and June, as today). |
| `InstantRange` | `{ start: Date; end: Date }` | Instants for database comparisons. Each function documents whether `end` is inclusive. |

Rules for these types:

- A `CalendarDate` is derived from an instant in Europe/Brussels (FR-003), unless a function says it keeps the process-local timezone (only the delegating `comp.ts` helpers in US1, see research R2).
- A `CalendarDate` is turned into an instant for the database in one of two documented ways (research R3):
  - `storedInstant(date)`: midnight in Brussels of that date. What production stores for memberships and uses for the Twizzit window (it runs with `TZ=Europe/Brussels`).
  - `brusselsDayRange(range)`: `[start of from in Brussels, start of the day after to in Brussels)`. Used by the ranking lookup.

## Existing entities read (unchanged)

| Entity | Fields used | Used by |
| --- | --- | --- |
| `RankingPlace` (`ranking.RankingPlaces`) | `playerId`, `systemId`, `rankingDate`, `updatePossible`, `single`, `double`, `mix` | Ranking lookup (US3) |
| `RankingSystem` | `id`, `amountOfLevels` | Lookup caller defaults (unchanged) |
| `ClubPlayerMembership` | `start`, `end`, `confirmed`, `clubId`, `membershipType` | Membership check and window (US2) |
| `EventCompetition` | `season`, `changeCloseRequestDatePeriod1`, `changeCloseRequestDatePeriod2`, `usedRankingUnit`, `usedRankingAmount` | Change-request deadline (US2), line-up window (US3) |
| `EncounterCompetition` | `date` | Season half and competition window (US2) |
| `Team` | `season` | Sync entry reference date (US3) |

## State transitions

None. The feature changes how values are computed, not what is stored.
