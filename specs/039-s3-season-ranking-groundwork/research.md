# Research: Season and Ranking Reference-Date Groundwork

**Feature**: 039-s3-season-ranking-groundwork | **Date**: 2026-11-19

Each item lists the decision, why, and what else was considered. Items marked **Verify before release** do not block implementation; they are read-only checks on production data.

## R1. Which timezone does production compute in today?

**Finding**: there is no single answer.

- Nothing in the repo sets `TZ` for the apps (no Dockerfile, no `render.yaml`, no `process.env.TZ`). Render runs Node in UTC unless the dashboard sets `TZ`.
- `backend-compile` calls `moment.tz.setDefault("Europe/Brussels")` inside `generateHtmlFromTemplate` (PDF and mail rendering). `moment-timezone` patches the shared `moment` instance, so from the first template render onwards every `moment()` in that process interprets dates in Brussels time. Verified locally: with `TZ=UTC`, `getSeason(new Date("2027-04-30T22:30:00Z"))` returns 2026 before the call and 2027 after it.
- The API and the sync worker both load `backend-compile` (via assembly and mailing). Their moment-based date logic therefore switches from UTC to Brussels during the process lifetime. Code that uses `Date` or `date-fns` directly (score-entry guards, sync entry cutoff, ranking sync) stays in the process timezone.

**Decision**: treat "current behaviour" as what a process computes **without** the Brussels default, which is what the characterization tests (BAD-409) pin. The new module computes in Europe/Brussels explicitly (FR-003), so the result no longer depends on whether a template was rendered. Removing the `setDefault` side effect itself is out of scope here: it is tracked as a bug in BAD-410, and BAD-380 (moment → date-fns) removes the root cause.

**Alternatives considered**: fixing `setDefault` now (changes PDF and mail formatting, unrelated to this feature); pinning `TZ=Europe/Brussels` on Render (changes every `Date` call at once, too broad for a groundwork feature).

**Verify before release**: whether the Render services set `TZ` (dashboard, not in the repo).

## R2. FR-003 (Brussels) versus FR-004/FR-010 (identical results)

**Finding**: deriving a season, a half or a window from an instant gives a different answer in Brussels than in UTC only for instants between 22:00/23:00 UTC and midnight UTC on a boundary day (for example 30 April 22:30 UTC). Today those instants already give different answers depending on R1.

**Decision**:

- US1: the old helpers in `comp.ts` delegate to the module **with the process-local timezone**, so they return exactly what they return today (FR-004). The BAD-409 tests stay green in both the UTC and the Brussels run.
- US2: migrated callers use the module's default, Europe/Brussels. For boundary instants in that 1–2 hour window this is an intended change (FR-003). The BAD-409 tests named "depends on the server timezone" are the only season tests US2 changes on purpose.
- **Spec amendment** (confirmed 2026-11-19): added as FR-010a, an exception in FR-010, SC-005 and SC-007, next to the two named bugs.

**Alternatives considered**: keep UTC everywhere (contradicts FR-003 and the regulations, which are Belgian calendar dates); switch the old helpers to Brussels in US1 (breaks FR-004 and the UTC characterization tests before any caller moves).

## R3. Comparing calendar dates with stored timestamps

**Finding**: ranking publications and memberships are stored as `timestamptz`. The ranking sync parses publication dates with `date-fns` `parseISO`/`parse` without an offset, so a publication for 10 June is stored at midnight of 10 June in the worker's timezone (00:00 UTC if the worker runs in UTC). Memberships created by the transfer and loan uploads use `moment`, so their `start` is 00:00 UTC or 22:00/23:00 UTC of the day before, depending on R1. The dev database has no synced data to confirm this.

**Decision**:

- Reference dates are **calendar dates** (`YYYY-MM-DD`), not instants.
- **Ranking lookups** (US3) turn a calendar range into instants as `[start of the first day in Brussels, start of the day after the last day in Brussels)`. This returns the same rows for data stored at midnight UTC and for data stored at midnight Brussels. Checked against the BAD-409 fixture: a place on 10 June 00:00 UTC stays included, 11 June stays excluded, and the May window is unchanged.
- **Every other instant that is written to or compared with the database** keeps today's value in US2: midnight UTC of the calendar date. That covers the membership check (`start <= 1 July 00:00 UTC`, `end > 1 July 00:00 UTC`), the membership window that transfers and loans write, and the Twizzit export window. The module offers these as explicit functions (`membershipCheckInstant`, `membershipWindow`, `twizzitExportWindow`) that name the storage assumption in one place (`storedInstant(calendarDate)`). A Brussels conversion would flip memberships that start at 1 July 00:00 UTC to "not yet active", which the BAD-409 tests catch.
- In short: deriving a season from an instant moves to Brussels (R2); database-facing instants stay as they are; ranking lookups use the Brussels-day range, which returns identical rows for data stored at midnight UTC.

**Alternatives considered**: convert every comparison to Brussels (breaks memberships stored at 00:00 UTC); compare on UTC calendar dates (breaks rows stored at Brussels midnight, if any exist).

**Verify before release** (read-only production queries):

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

**Decision**: one batch query that returns a `Map<playerId, place>` using `ROW_NUMBER() OVER (PARTITION BY "playerId" ORDER BY "rankingDate" DESC)`. It works in Postgres and SQLite 3.25+, and the table name comes from Sequelize (`queryInterface.quoteTable(RankingPlace.getTableName())`). Parameters: player ids, system id, `onOrBefore`, optional `onOrAfter`, optional `updatePossibleOnly`, optional transaction. Callers map the result onto their current output shape.

**Alternatives considered**: keep `DISTINCT ON` (Postgres-only, breaks the SQLite specs); `findAll` and reduce in JavaScript (loads a player's full publication history).

## R7. Line-up window from the event setting

**Finding**: the line-up check builds the window with `moment().set("year", season).set(unit, amount)` and takes that month. For `months` this is a fixed month (4 → May). For `weeks` or `days` the result depends on today's date, which the spec keeps as current behaviour.

**Decision**: `lineUpRankingWindow(event)` computes `months` explicitly as a calendar month. For other units it keeps the current moment computation verbatim, marked for BAD-380. The function still throws when the setting is missing.

**Verify before release**:

```sql
SELECT "usedRankingUnit", "usedRankingAmount", count(*)
FROM event."EventCompetitions" GROUP BY 1, 2;
```

If only `months` is used, BAD-380 can drop the other branch.

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
