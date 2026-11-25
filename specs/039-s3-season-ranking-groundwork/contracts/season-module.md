# Contract: season module (`@badman/utils`)

Internal TypeScript API, exported from `@badman/utils`. Every function documents its rule and its regulation reference, or says it is a practical rule (FR-002). Functions that take a moment (`at`) accept a `Date` or a `CalendarDate`; an instant is read on the Brussels calendar unless a `timeZone` is passed (FR-003). Every function that takes both puts `at` first, then `season`.

## Season concepts (US1)

| Function | Returns | Rule | Source |
| --- | --- | --- | --- |
| `enrollmentSeason(at?): Season` | Season number | Switches on 1 May: 30 April 2027 → 2026, 1 May 2027 → 2027. Defaults to now. | Practical rule, no regulation |
| `competitionSeasonWindow(season): CalendarRange` | 1 Sep `season` – 30 Apr `season + 1` | | C320 art. 1§2 |
| `isInCompetitionSeason(at, season): boolean` | | Calendar date of `at` inside the window, both ends included | C320 art. 1§2 |
| `seasonHalf(at, season): SeasonHalf \| null` | | Calendar year = season → first; season + 1 → second; else null | C320 art. 20§3, 26§5 (practical split, includes May and June) |
| `membershipPeriod(season): CalendarRange` | 1 Jul `season` – 30 Jun `season + 1` | Calendar dates of the membership | C925, C950 |
| `membershipWindow(season): InstantRange` | 1 Jul `season` 00:00 – 30 Jun `season + 1` 23:59:59.999, Brussels time | Stored-instant convention (research R3) | C925, C950 |
| `membershipCheckInstant(season): Date` | 1 Jul `season` 00:00 Brussels time | Moment at which membership is checked for enrollment | C925, C950 |
| `isScoreEntrySeasonOpen(at, season): boolean` | | Open until 1 July of `season + 1` | Practical rule (leagues play into May and June) |
| `oldestOpenScoreEntrySeason(at): Season` | | Switches on 1 July | Practical rule |
| `nextSeason(at?): Season` | | Switches on 1 October | Practical rule, purpose unclear (kept, see spec assumptions) |
| `twizzitExportWindow(season): InstantRange` | 1 Sep `season` 00:00 – 1 Sep `season + 1` 00:00, Brussels time, both included | Stored-instant convention | Practical rule (Twizzit export) |

Helpers: `toCalendarDate(at: Date, timeZone = "Europe/Brussels"): CalendarDate`, `storedInstant(date: CalendarDate): Date` (midnight in Brussels), `brusselsDayRange(range: CalendarRange): { start: Date; endExclusive: Date }`.

## Ranking reference dates (US3)

| Function | Returns | Rule | Source |
| --- | --- | --- | --- |
| `enrollmentRankingDate(season): CalendarDate` | `season-06-10` | Current rule kept: latest place up to 10 June. C320 says the May ranking (open question for BV, BAD-401) | C320 art. 51§1 (differs) |
| `lineUpRankingWindow(event): CalendarRange` | Calendar month from `usedRankingUnit` / `usedRankingAmount` in the season year | Only `months` (the only unit in use, research R7); throws for other units or when the setting is missing | Current behaviour |

The ranking on the day of the encounter (C320 art. 51§2, 55§1) gets a function when a caller needs it; no current caller does.

## Delegating helpers (US1 only, removed in US2)

`getSeason`, `getSeasonPeriod`, `startOfSeason`, `endOfSeason` and `getNextSeason` in `comp.ts` keep their signatures and return exactly what they return today (FR-004). They read the input date with moment in the process timezone, as before, and pass the resulting calendar date to the module (research R2). US2 removes them once no caller uses them (FR-009).
