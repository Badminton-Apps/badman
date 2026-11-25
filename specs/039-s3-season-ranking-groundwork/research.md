# Research: Season and Ranking Reference-Date Groundwork

**Feature**: 039-s3-season-ranking-groundwork | **Date**: 2026-11-19, updated 2026-11-25 (production timezone, review on #1177)

Each item lists the decision, why, and what else was considered. Items marked **Verify** do not block implementation; they are read-only checks on production data.

## R1. Which timezone does production compute in today?

**Finding**: Europe/Brussels. The Render dashboard sets `TZ=Europe/Brussels` on the API, the sync worker and the ranking worker (checked 2026-11-25; the setting is not in the repo).

- `backend-compile` calls `moment.tz.setDefault("Europe/Brussels")` inside `generateHtmlFromTemplate` (PDF and mail rendering). That patches the shared `moment` instance for the rest of the process. In production it changes nothing, because the process already runs in Brussels time; it only makes a process in another timezone (local, CI) switch halfway. Tracked as BAD-410 (low priority); BAD-380 removes the call.
- Code that uses `Date` or `date-fns` without a timezone (score-entry guards, sync entry cutoff, ranking sync) also computes in Brussels time in production.

**Decision**: "current behaviour" is what production computes, so the tests run in Europe/Brussels by default (`jest.global-setup.js`) and the BAD-409 characterization tests pin the Brussels answers. The new module computes in Europe/Brussels explicitly (FR-003), so its results no longer depend on the server timezone; suites of migrated callers also run in UTC to prove it (`jest.also-run-in-timezone.ts`).

**Alternatives considered**: keep the tests in UTC, as CI runners do (pins values production never computes, as #1176 did at first); fix `setDefault` now (changes PDF and mail formatting, unrelated to this feature).

## R2. FR-003 (Brussels) versus FR-004/FR-010 (identical results)

**Finding**: deriving a season, a half or a window from an instant gives a different answer in Brussels than in UTC only for instants between 22:00/23:00 UTC and midnight UTC on a boundary day (for example 30 April 22:30 UTC). Production already computes in Brussels (R1), so for production the module's explicit Brussels default gives the same answers as today.

**Decision**:

- US1: the old helpers in `comp.ts` delegate to the module but keep reading the date the way they did, with moment in the process timezone, so they return exactly what they return today in every timezone (FR-004).
- US2/US3: migrated callers use the module's default, Europe/Brussels. No change in production; a process in UTC now gives the production answer too (FR-010a).

**Alternatives considered**: delegate with `Intl.DateTimeFormat().resolvedOptions().timeZone` (differs from moment once `setDefault` has run, R1); switch the old helpers to Brussels in US1 (changes their answers in a UTC process before any caller moves).

## R3. Comparing calendar dates with stored timestamps

**Finding**: ranking publications and memberships are stored as `timestamptz`. The ranking sync parses publication dates without an offset, and the transfer and loan uploads build their dates with moment, both in the process timezone. With `TZ=Europe/Brussels` (R1), a publication for 10 June and a membership starting 1 July are stored at midnight in Brussels: 9 June 22:00 UTC and 30 June 22:00 UTC.

Production check (2026-11-25, read-only):

| Stored value | Midnight in Brussels (22:00/23:00 UTC) | Midnight UTC | Other times |
| --- | --- | --- | --- |
| `RankingPlaces.rankingDate` | about 90% (≈4.29 million) | about 10% (≈480,000, all in 2022 and 2023) | 89 rows (manual edits), 2 without a date |
| `ClubPlayerMemberships.start` | about 90% (≈50,000) | about 9.5% (5,254, older uploads) | a few dozen |
| `ClubPlayerMemberships.end` | mostly 22:00 / 23:00 / 21:59:59 | a few hundred at 00:00 / 23:59:59 | processing times (transfers end the old membership "now") |

No publication is stored at midnight UTC on 10 June 2022 or 2023.

**Decision**:

- Reference dates are **calendar dates** (`YYYY-MM-DD`), not instants.
- **Instants written to or compared with the database** are midnight in Brussels, which is what production writes and compares today: the membership check, the membership window that transfers and loans write, and the Twizzit export window. The module names that convention once, in `storedInstant(calendarDate)`. Using midnight UTC instead would make a transfer or loan re-upload miss the rows earlier uploads created and create duplicates.
- **Ranking lookups** (US3) turn a calendar range into `[start of the first day in Brussels, start of the day after the last day in Brussels)`. That is exactly today's production window for the 10 June cutoff and for the line-up month. Rows stored at midnight UTC give the production answer too, with one theoretical exception: a midnight-UTC publication exactly on 10 June was excluded by today's cutoff (`<= 9 June 22:00 UTC`) and counts now. The production check found no such row, so every lookup gives today's answer.
- Memberships stored at midnight UTC are compared against midnight in Brussels before and after this change, so they give the same results as today.

**Alternatives considered**: midnight UTC for database instants (what a UTC process computed; differs from production, see above); compare on UTC calendar dates (breaks rows stored at Brussels midnight, which is most of them).

**Queries used** (read-only):

```sql
-- time of day of stored publication dates
SELECT to_char("rankingDate" AT TIME ZONE 'UTC', 'HH24:MI') AS t, count(*)
FROM ranking."RankingPlaces" GROUP BY 1 ORDER BY 2 DESC LIMIT 5;

-- time of day of membership start dates
SELECT to_char("start" AT TIME ZONE 'UTC', 'HH24:MI') AS t, count(*)
FROM public."ClubPlayerMemberships" GROUP BY 1 ORDER BY 2 DESC LIMIT 5;
```

## R4. Date library

**Decision**: `date-fns` 4 with `date-fns-tz` 3 (`toZonedTime`, `fromZonedTime`) in `@badman/utils`. Both are already in the repo (`apps/api`, `apps/worker/sync`, `backend-visual`), so no new library.

**Alternatives considered**: `@date-fns/tz` (`TZDate`, date-fns 4 native; a new dependency for one feature); moment-timezone (being removed in BAD-380, and the source of R1).

## R5. Where the code lives

**Decision**:

- Season concepts and ranking reference dates: `packages/utils/src/lib/season/` (pure functions, no database). `@badman/utils` is already a dependency of every caller.
- Ranking lookup: `packages/backend-database/src/queries/latest-ranking-places.ts`, exported from `@badman/backend-database`. The four callers already depend on that package; enrollment and assembly do not depend on `@badman/backend-ranking`.

**Alternatives considered**: a NestJS service in `backend-ranking` (adds a dependency to enrollment and assembly and DI wiring to processors); a static on `RankingPlace` (mixes query helpers into the model file, which already holds hooks).

## R6. One lookup for four callers

**Finding**: the callers use three query shapes: raw `DISTINCT ON` (enrollment), an include with `limit: 1` on `team.getPlayers` (export), an include with `separate: true` (line-up check) and an include with `limit: 1` without a system filter (sync). The big assembly spec runs on SQLite, so the lookup must work there too.

**Decision**: one batch query that returns a `Map<playerId, place>` using `ROW_NUMBER() OVER (PARTITION BY "playerId" ORDER BY "rankingDate" DESC)`. It works in Postgres and SQLite 3.25+, and the table name comes from Sequelize (the query generator's `quoteTable(RankingPlace.getTableName())`). The date bounds are passed as UTC text (`YYYY-MM-DD HH:mm:ss.SSS +00:00`): SQLite stores dates in that format and compares text, while Sequelize would format a `Date` replacement in the process timezone; Postgres reads the text as the same instant. Parameters: player ids, system id, `onOrBefore`, optional `onOrAfter`, optional `updatePossibleOnly`, optional transaction. Callers map the result onto their current output shape.

**Alternatives considered**: keep `DISTINCT ON` (Postgres-only, breaks the SQLite specs); `findAll` and reduce in JavaScript (loads a player's full publication history).

## R7. Line-up window from the event setting

**Finding**: the line-up check builds the window with `moment().set("year", season).set(unit, amount)` and takes that month. For `months` this is a fixed month (4 → May). For `weeks` or `days` the result depends on today's date, which the spec keeps as current behaviour.

**Production check** (2026-11-25): all 156 events use `months` with amount 4 (May).

**Decision**: `lineUpRankingWindow(event)` computes `months` explicitly as a calendar month and rejects other units with a clear error; the `weeks` / `days` branch, whose moment semantics depended on today's date, is removed. The function still throws when the setting is missing (also for amount 0, as today).

**Query used** (read-only):

```sql
SELECT "usedRankingUnit", "usedRankingAmount", count(*)
FROM event."EventCompetitions" GROUP BY 1, 2;
```

## R8. Line-up player cache (FR-015)

**Decision**: key the cache on player id, ranking system id and the window (`${playerId}|${systemId}|${from}|${to}`). The cleanup interval and size cap stay as they are.

## R9. Callers in scope for US2

From the code (`grep` for the helpers and inline month/year logic):

| Caller | Today | Module function |
| --- | --- | --- |
| `backend-graphql/.../encounter-change.service.ts` | calendar-year fallback, period-1 for both halves, own competition window | `enrollmentSeason`, `seasonHalf`, `isInCompetitionSeason` (FR-007, FR-008) |
| `change-encounter/.../encounter.service.ts`, `rules/semester.rule.ts`, `rules/team-club.rule.ts` | `getFullYear() === season` | `seasonHalf` |
| `change-encounter/.../rules/dates-in-period.ts` | `getSeasonPeriod` | `competitionSeasonWindow` |
| `enrollment/.../enrollment.service.ts` | `getSeason()` fallback | `enrollmentSeason` |
| `enrollment/.../rules/player-club.rule.ts` | `startOfSeason` | `membershipCheckInstant` |
| `transfer-loans/.../transfers.service.ts`, `loans.service.ts.ts` | inline 1 July / 30 June via moment | `membershipWindow` |
| `backend-graphql/.../player.resolver.ts` | `getSeason()` default | `enrollmentSeason` |
| `apps/worker/sync/.../enter-scores/guards.ts` | own 1 July rule | `isScoreEntrySeasonOpen`, `oldestOpenScoreEntrySeason` |
| `backend-twizzit/.../game-export.service.ts` | 1 Sep – 1 Sep window | `twizzitExportWindow` |
| `database/seeders/**`, `backend-database/src/_testing/load-test.ts` | 1 May / 1 September switches | `enrollmentSeason`, `competitionSeasonWindow` |

**Not in scope**: `calculate-index.resolver.ts` checks `season <= currentYear + 1`. That is input validation, not a season derivation; it stays as is (pinned by BAD-409).
