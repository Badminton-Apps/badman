# Contract: season module (`@badman/utils`)

Internal TypeScript API, exported from `@badman/utils`. Every function documents its rule and its regulation reference, or says it is a practical rule (FR-002). Instants are interpreted in Europe/Brussels unless stated otherwise (FR-003).

## Season concepts (US1)

| Function | Returns | Rule | Source |
| --- | --- | --- | --- |
| `enrollmentSeason(at?: Date): Season` | Season number | Switches on 1 May: 30 April 2027 → 2026, 1 May 2027 → 2027. Defaults to now. | Practical rule, no regulation |
| `competitionSeasonWindow(season): CalendarRange` | 1 Sep `season` – 30 Apr `season + 1` | | C320 art. 1§2 |
| `isInCompetitionSeason(at: Date, season): boolean` | | Calendar date of `at` inside the window, both ends included | C320 art. 1§2 |
| `seasonHalf(at: Date, season): SeasonHalf \| null` | | Calendar year = season → first; season + 1 → second; else null | C320 art. 20§3, 26§5 (practical split, includes May and June) |
| `membershipWindow(season): InstantRange` | 1 Jul `season` 00:00 UTC – 30 Jun `season + 1` 23:59:59.999 UTC | Stored-instant convention (research R3) | C925, C950 |
| `membershipCheckInstant(season): Date` | 1 Jul `season` 00:00 UTC | Moment at which membership is checked for enrollment | C925, C950 |
| `isScoreEntrySeasonOpen(season, at: Date): boolean` | | Open until 1 July of `season + 1` | Practical rule (leagues play into May and June) |
| `oldestOpenScoreEntrySeason(at: Date): Season` | | Switches on 1 July | Practical rule |
| `nextSeason(at?: Date): Season` | | Switches on 1 October | Practical rule, purpose unclear (kept, see spec assumptions) |
| `twizzitExportWindow(season): InstantRange` | 1 Sep `season` 00:00 UTC – 1 Sep `season + 1` 00:00 UTC, both included | Stored-instant convention | Practical rule (Twizzit export) |

Helpers: `toCalendarDate(at: Date, timeZone = "Europe/Brussels"): CalendarDate`, `storedInstant(date: CalendarDate): Date`, `brusselsDayRange(range: CalendarRange): { start: Date; endExclusive: Date }`.

## Ranking reference dates (US3)

| Function | Returns | Rule | Source |
| --- | --- | --- | --- |
| `enrollmentRankingDate(season): CalendarDate` | `season-06-10` | Current rule kept: latest place up to 10 June. C320 says the May ranking (open question for BV, BAD-401) | C320 art. 51§1 (differs) |
| `encounterRankingDate(encounterDate: Date): CalendarDate` | Calendar date of the encounter | Ranking on the day of the encounter | C320 art. 51§2, 55§1 |
| `lineUpRankingWindow(event): CalendarRange` | Calendar month from `usedRankingUnit` / `usedRankingAmount` in the season year | `months` explicit; other units keep the current moment computation (research R7). Throws when the setting is missing | Current behaviour |

## Delegating helpers (US1 only, removed in US2)

`getSeason`, `getSeasonPeriod`, `startOfSeason`, `endOfSeason` and `getNextSeason` in `comp.ts` keep their signatures and return exactly what they return today (FR-004). They call the module with the process-local timezone (research R2). US2 removes them once no caller uses them (FR-009).
