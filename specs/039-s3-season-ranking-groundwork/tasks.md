# Tasks: Season and Ranking Reference-Date Groundwork

**Input**: Design documents from `/specs/039-s3-season-ranking-groundwork/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: required. FR-018 asks for tests before the change they cover, and for every bug fix a failing test first. The characterization tests from BAD-409 (`comp.spec.ts`, `*.characterization.spec.ts`, `*.integration.spec.ts` and the tests named "current behaviour, fixed in BAD-xxx") are the safety net and must stay green unless a task says otherwise.

**Tickets and branches**: each user story is one ticket, one branch off `feat/refactor` and one PR into it. US1 = BAD-390 (`refactor/bad-390-season-module`), US2 = BAD-391, US3 = BAD-392. Run lint, typecheck (`build`) and tests per touched package before handing a commit over for review.

## Status (2026-11-25)

US1–US3 are implemented: #1178 (BAD-390), #1179 (BAD-391), #1180 (BAD-392), stacked on #1181, which makes the tests run in Europe/Brussels like production (research R1); T037/T038 are in #1182. The task texts below are updated to what was built. Open: T040 (coverage after the merges).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no open dependency)
- **[Story]**: US1, US2 or US3 from spec.md

---

## Phase 1: Setup

**Purpose**: dependencies and a green baseline.

- [x] T001 Add `"date-fns": "^4.1.0"` and `"date-fns-tz": "^3.2.0"` (the versions already used in `apps/api`) to `dependencies` in `packages/utils/package.json` and run `pnpm install`; commit the `pnpm-lock.yaml` change with it
- [x] T002 Record the baseline: run `pnpm turbo run build lint test` and the three integration specs from [quickstart.md](quickstart.md) with `RUN_INTEGRATION_TESTS=1`; all must pass before any code change

---

## Phase 2: Foundational (blocks US1 and US3)

**Purpose**: calendar-date helpers that both the season module and the ranking reference dates use (data-model.md, research R3).

- [x] T003 Write `packages/utils/src/lib/season/calendar.spec.ts` first. Cover `toCalendarDate` (30 April 22:30 UTC → `2027-05-01` in Brussels, `2027-04-30` with `timeZone: "UTC"`; summer and winter time; leap day), `storedInstant("2026-07-01")` → `2026-06-30T22:00:00.000Z` (midnight in Brussels), and `brusselsDayRange({ from: "2026-05-01", to: "2026-05-31" })` → start `2026-04-30T22:00:00.000Z`, endExclusive `2026-05-31T22:00:00.000Z` (and a winter range with +01:00). End the suite with `alsoRunInTimezone(__filename, "UTC")` from the shared `jest.also-run-in-timezone.ts` at the repo root, so it also runs in UTC and must give identical results
- [x] T004 Implement `packages/utils/src/lib/season/calendar.ts`: `type CalendarDate`, `type CalendarRange`, `toCalendarDate(at, timeZone = "Europe/Brussels")`, `storedInstant(date)`, `brusselsDayRange(range)` with `date-fns-tz` (`toZonedTime`, `fromZonedTime`, `formatInTimeZone`). Each function gets a doc comment that names its rule (research R3)
- [x] T005 Create `packages/utils/src/lib/season/index.ts` exporting `calendar.ts`, and export the folder from `packages/utils/src/index.ts` (or the existing lib barrel) so `@badman/utils` exposes it

**Checkpoint**: `cd packages/utils && pnpm test && pnpm run build` pass.

---

## Phase 3: User Story 1 — One named place for every season concept (P1, BAD-390) 🎯 MVP

**Goal**: one module with a named, documented function per season concept ([contracts/season-module.md](contracts/season-module.md)); the old `comp.ts` helpers delegate and return exactly what they return today.

**Independent test**: the module tests pass in Europe/Brussels and UTC with identical results; `comp.spec.ts` and every other BAD-409 test pass unchanged.

### Tests for User Story 1 (write first, they must fail)

- [x] T006 [US1] Write `packages/utils/src/lib/season/season.spec.ts`, also run in UTC (`alsoRunInTimezone`). For every function in the "Season concepts" table of contracts/season-module.md, test both sides of each boundary in Brussels local time and across the turn of the year, plus the spec's US1 acceptance scenarios 1–4. Include: `enrollmentSeason` (30 April 23:59 / 1 May 00:00 Brussels, and an instant 30 April 22:30 UTC → 2027 in both TZ runs), `competitionSeasonWindow(2026)` → `{ from: "2026-09-01", to: "2027-04-30" }`, `isInCompetitionSeason` (31 Aug / 1 Sep / 30 Apr / 1 May), `seasonHalf` (31 Dec → first, 1 Jan → second, 15 May → second, 15 Aug of the season year → first, 1 Sep of the next year → second, 1 Jan two years later → null), `membershipWindow` / `membershipCheckInstant` (midnight in Brussels: `2026-06-30T22:00:00.000Z`), `isScoreEntrySeasonOpen` / `oldestOpenScoreEntrySeason` (30 June / 1 July), `nextSeason` (30 Sep / 1 Oct), `twizzitExportWindow(2026)` (`2026-08-31T22:00:00.000Z` – `2027-08-31T22:00:00.000Z`)

### Implementation for User Story 1

- [x] T007 [US1] Implement `packages/utils/src/lib/season/season.ts` per contracts/season-module.md on top of `calendar.ts`. Every function gets a doc comment with its rule and its regulation reference, or "practical rule, no regulation" (FR-002). Functions that derive from an instant take an optional `timeZone` defaulting to `"Europe/Brussels"` (research R2). Export from `season/index.ts`
- [x] T008 [US1] Make `getSeason`, `getSeasonPeriod`, `getNextSeason`, `startOfSeason` and `endOfSeason` in `packages/utils/src/lib/comp.ts` delegate to the module: read the input date with moment in the process timezone, as before, and pass the calendar date to the module (research R2). Keep signatures and return types: `startOfSeason`/`endOfSeason` still return `moment` objects, and `getSeasonPeriod` keeps treating `0`/missing as "current season". Mark each helper `@deprecated` with a pointer to its replacement (FR-004)
- [x] T009 [US1] Run `packages/utils` tests (Europe/Brussels by default, plus the UTC runs); `comp.spec.ts` (BAD-409) must pass unchanged. Then run `pnpm turbo run build lint test` for the whole repo: no other test may change

**Checkpoint**: US1 is shippable on its own: no caller changed, the module exists and is tested.

---

## Phase 4: User Story 2 — Every caller uses the module, two change-request bugs fixed (P2, BAD-391)

**Goal**: no season derivation outside the module (FR-006); second-half deadline and calendar-year fallback fixed (FR-007, FR-008); old helpers removed (FR-009).

**Independent test**: the grep in quickstart.md finds nothing outside the module; the BAD-409 tests pass except the ones named "current behaviour, fixed in BAD-391" (flipped) and "depends on the server timezone" (FR-010a).

**Depends on**: US1.

### Bug fixes, failing test first (FR-018)

- [x] T010 [US2] In `packages/backend-graphql/src/resolvers/event/competition/encounter-change.service.spec.ts`, rewrite the three tests named "current behaviour, fixed in BAD-391: rejects a second-half encounter after the period-1 deadline" (propose, triage, finalize) to expect acceptance before the period-2 deadline, and add spec US2 acceptance scenarios 1–3. Run them: they must fail
- [x] T011 [US2] In the same spec, rewrite the three "current behaviour, fixed in BAD-391: … uses the calendar year" tests to expect the season from `enrollmentSeason` (10 February 2027 → 2026, so a proposal on 20 February 2027 is in season; spec US2 scenario 4). Run them: they must fail
- [x] T012 [US2] Fix `packages/backend-graphql/src/resolvers/event/competition/encounter-change.service.ts`: replace `event?.season ?? new Date().getFullYear()` (propose and triage) with `event?.season ?? enrollmentSeason()`; in `_assertDeadlineNotPassed` pick the deadline with `seasonHalf(encounter.date, event.season)` (`"second"` → period 2, otherwise period 1, keeping today's period-2 fallback for no season, no date or outside the season); replace `_isInCompetitionSeason` with `isInCompetitionSeason`. T010 and T011 now pass; all other tests in the file pass unchanged

### Callers (each keeps its results, FR-010; the BAD-409 tests prove it)

- [x] T013 [P] [US2] `packages/backend-competition/change-encounter/src/services/validate/encounter.service.ts`: derive `season` with `enrollmentSeason`, split `encountersSem1`/`encountersSem2` with `seasonHalf`. `season.characterization.spec.ts` passes unchanged
- [x] T014 [P] [US2] `packages/backend-competition/change-encounter/src/services/validate/rules/semester.rule.ts` and `rules/team-club.rule.ts`: replace `suggestedDate.date.getFullYear() === season` with `seasonHalf(suggestedDate.date, season) === "first"`. Existing rule specs and `season.characterization.spec.ts` pass unchanged
- [x] T015 [P] [US2] `packages/backend-competition/change-encounter/src/services/validate/rules/dates-in-period.ts`: build the period from `competitionSeasonWindow(season ?? enrollmentSeason())`; keep the day-granular inclusive comparison and the error params (`season: date.year()`, `DD/MM/YYYY` strings) exactly as today
- [x] T016 [P] [US2] `packages/backend-competition/enrollment/src/services/validate/enrollment.service.ts`: `season ?? enrollmentSeason()`; `rules/player-club.rule.ts`: `membershipCheckInstant(season)` instead of `startOfSeason(season).toDate()`. `season.characterization.spec.ts` (enrollment) passes unchanged
- [x] T017 [P] [US2] `packages/backend-competition/transfer-loans/src/services/transfers.service.ts` and `loans.service.ts.ts`: take start and end from `membershipWindow(season)` instead of the inline moment chains. The "membership dates (characterization)" tests pass unchanged
- [x] T018 [P] [US2] `packages/backend-graphql/src/resolvers/player/player.resolver.ts`: `season ?? enrollmentSeason()` in `teams`. The "teams: default season" tests pass unchanged
- [x] T019 [P] [US2] `apps/worker/sync/src/app/processors/enter-scores/guards.ts`: make `isSeasonOpen` and `oldestOpenSeason` call `isScoreEntrySeasonOpen` and `oldestOpenScoreEntrySeason` (or replace their callers and remove them). `__tests__/guards.spec.ts` passes unchanged
- [x] T020 [P] [US2] `packages/backend-twizzit/src/services/game-export/game-export.service.ts`: use `twizzitExportWindow(year)` for the `Op.between` range. `game-export.service.spec.ts` passes unchanged
- [x] T021 [P] [US2] `packages/backend-database/src/_testing/load-test.ts`: `enrollmentSeason()` instead of `getSeason()`
- [x] T022 [US2] Seeders: replace the inline season rules in `database/seeders/20250101000000-seed-test-data.js` (line ~303, 1 May switch), `database/seeders/utils/data-factory.ts` (`getSeason`, 1 September switch) and `database/seeders/utils/entity-builders.ts` (line ~355–362) with the module. The root has no workspace dependencies, so require the built package by relative path (`packages/utils/dist`), build `@badman/utils` first, and rebuild `database/seeders/utils/dist`. `data-factory.getSeason` uses `competitionSeasonWindow` semantics only if a seeder depends on the 1 September switch; otherwise use `enrollmentSeason` (seed dates may shift within the same season, spec assumption). Run `npm run seed:test-data` against the dev database to confirm it still seeds (done 2026-11-25 on a temporary schema copy of the dev database, so existing seed data stays untouched)

### Timezone change and cleanup

- [x] T023 [US2] End the season suites of migrated callers (change requests, change-encounter and enrollment characterization, transfers, loans, Twizzit, score-entry guards) with `alsoRunInTimezone(__filename, "UTC")`: they must give the production answer in UTC too (FR-010a). Every date operation edited here uses date-fns, not moment
- [x] T024 [US2] Remove `getSeason`, `getSeasonPeriod`, `getNextSeason`, `startOfSeason` and `endOfSeason` from `packages/utils/src/lib/comp.ts` once `grep -rn` finds no caller (FR-009); move the still-relevant assertions of `comp.spec.ts` into `season/season.spec.ts` and delete the file if empty. Check `apps/` and `database/` too
- [x] T025 [US2] Run the SC-001 grep from quickstart.md; any hit outside `packages/utils/src/lib/season` (other than `calculate-index.resolver.ts`, research R9) is a missed caller. Then `pnpm turbo run build lint test`

**Checkpoint**: US2 done when the grep is clean and the full run passes.

---

## Phase 5: User Story 3 — One ranking reference date per concept and one lookup (P3, BAD-392)

**Goal**: named reference dates and one lookup ([contracts/ranking-lookup.md](contracts/ranking-lookup.md)); each caller passes its current rule; sync system filter (FR-014) and line-up cache (FR-015) fixed.

**Independent test**: the three integration specs return the same places, except the sync "any ranking system" test (flipped); unit tests pass.

**Depends on**: Phase 2 (calendar helpers) only. Can run in parallel with US2.

### Tests first

- [x] T026 [P] [US3] Write `packages/utils/src/lib/season/ranking-dates.spec.ts`: `enrollmentRankingDate(2026)` → `"2026-06-10"`; `lineUpRankingWindow({ season: 2026, usedRankingUnit: "months", usedRankingAmount: 4 })` → `{ from: "2026-05-01", to: "2026-05-31" }`, independent of today's date; throws `"EventCompetition usedRankingUnit is not set"` when the setting is missing
- [x] T027 [P] [US3] Write `packages/backend-database/src/queries/latest-ranking-places.spec.ts` on SQLite (in-memory `Sequelize` with the models, `sync({ force: true })`), using places like the BAD-409 fixture: newest place on or before the date; a place exactly on the `onOrBefore` date is included; `onOrAfter` lower bound; `updatePossibleOnly`; system filter; player without places absent; empty `playerIds` returns an empty map without a query
- [x] T028 [US3] Flip the BAD-409 tests that pin the bugs this story fixes; they must fail before T035/T036: in `apps/worker/sync/.../__tests__/entry.spec.ts` the "does not filter ranking places on a ranking system" test (expect the primary system id in the lookup), in `entry.integration.spec.ts` "takes the newest place of any ranking system" (expect 8, the system A place), and in `packages/backend-competition/assembly/src/services/validate/ranking-date.characterization.spec.ts` "reuses a cached player for another season or system" (expect a second query and the right player per season/system)

### Implementation

- [x] T029 [US3] Implement `packages/utils/src/lib/season/ranking-dates.ts` per contracts/season-module.md ("Ranking reference dates"); support only `months` in `lineUpRankingWindow`, the only unit in use (research R7), and reject other units. Export from `season/index.ts`
- [x] T030 [US3] Implement `packages/backend-database/src/queries/latest-ranking-places.ts` (`findLatestRankingPlaces`) per contracts/ranking-lookup.md: `ROW_NUMBER() OVER (PARTITION BY "playerId" ORDER BY "rankingDate" DESC)`, table name via `queryInterface.quoteTable(RankingPlace.getTableName())`, bounds from `brusselsDayRange`, `QueryTypes.SELECT`, optional transaction. Export it from `packages/backend-database/src/index.ts`. T027 passes
- [x] T031 [US3] Enrollment team index: in `packages/backend-competition/enrollment/src/services/index-calculation/index-calculation.service.ts`, replace `fetchPlaceMap`'s cutoff and `_fetchLatestPlacesPerPlayer` with `findLatestRankingPlaces({ onOrBefore: enrollmentRankingDate(season), systemId, playerIds })`. Update the existing unit tests that mock `_fetchLatestPlacesPerPlayer` to mock the new function; their expectations stay the same. `index-calculation.integration.spec.ts` passes unchanged
- [x] T032 [US3] Line-up export: in `packages/backend-competition/assembly/src/services/export/export.service.ts`, load team players without the `RankingPlace` include and attach the place from `findLatestRankingPlaces({ onOrBefore: enrollmentRankingDate(season), updatePossibleOnly: true, ... })` so the rest of the export reads the same values. Rewrite `export.service.spec.ts` to assert the lookup arguments instead of the include; `ranking-lookups.integration.spec.ts` (export part) passes unchanged
- [x] T033 [US3] Line-up check: in `packages/backend-competition/assembly/src/services/validate/assembly.service.ts`, compute the window with `lineUpRankingWindow(event)` and pass calendar dates down; in `batchFetchPlayersWithCache`, fetch players without the `RankingPlace` include and attach places from `findLatestRankingPlaces({ onOrAfter: from, onOrBefore: to, updatePossibleOnly: true, ... })`. `getSnapshotRanking` keeps reading `rankingPlaces[0]`. The window tests in `ranking-date.characterization.spec.ts` keep their expectations (adapt only how the window is captured); `ranking-lookups.integration.spec.ts` (check part) passes unchanged
- [x] T034 [US3] Line-up cache (FR-015): key `playerCache` in `assembly.service.ts` on `${playerId}|${systemId}|${from}|${to}`; cleanup and size cap unchanged. The flipped cache test from T028 passes
- [x] T035 [US3] Sync worker (FR-014): in `apps/worker/sync/src/app/processors/sync-events/competition-sync/processors/entry.ts`, look up the primary ranking system once per run (`RankingSystem.findOne({ where: { primary: true } })`, cached on the processor) and replace the `rankingPlaces` include with `findLatestRankingPlaces({ onOrBefore: enrollmentRankingDate(team.season), systemId, playerIds })`. Keep the fallbacks (existing meta, then the place, then 12). Update `entry.spec.ts` mocks for the new call; the flipped tests from T028 pass
- [x] T036 [US3] Run the three integration specs with `RUN_INTEGRATION_TESTS=1`: all places identical to the baseline except the flipped sync test. Then `pnpm turbo run build lint test`

**Checkpoint**: US3 done when the integration specs match and the full run passes.

---

## Phase 6: Polish & cross-cutting

- [x] T037 [P] Update `AGENTS.md` (architecture and testing notes) to point at the season module and `findLatestRankingPlaces` as the only place for season and ranking-date rules
- [x] T038 [P] Add an entry to `docs/tech-debt.md` for the storage-convention assumption in `storedInstant` (midnight in Brussels, research R3), and bump its version line
- [x] T039 Run the read-only production checks from research.md (R1 Render `TZ`: done, Europe/Brussels on the API and both workers; R3 time of day of `RankingPlaces.rankingDate` and `ClubPlayerMemberships.start`; R7 line-up units) and record the results in the BAD-392 PR description; open a follow-up if stored times are not mostly 22:00/23:00 UTC
- [ ] T040 Run `pnpm test:coverage:report` on the merged `feat/refactor` commit and compare with the BAD-409 number (44.3% lines)

---

## Dependencies & execution order

- **Phase 1 → Phase 2**: T001 before T004 (needs date-fns-tz).
- **Phase 2 → US1 and US3**: calendar helpers block both.
- **US1 → US2**: US2 migrates callers to the module from US1.
- **US3** depends on Phase 2, not on US1's season functions or on US2. It can run in parallel with US2 on its own branch, but merge order into `feat/refactor` should be US1 → (US2 | US3).
- Within a story: tests (and flipped bug tests) before implementation; T012 after T010–T011; T031–T035 after T030; T034 after T033.

## Parallel opportunities

- US2: T013–T021 touch different files and can be done in any order once T012 is in (they share no code).
- US3: T026 and T027 in parallel; then T029 and T030 in parallel; T031, T032 and T035 in parallel after T030 (different packages); T033 → T034 sequential (same file).
- Polish: T037 and T038 in parallel.

## Implementation strategy

1. **MVP = US1 (BAD-390)**: Phase 1 + 2 + 3. Ships the module with no behaviour change; reviewers check the module and its tests in isolation.
2. **US2 (BAD-391)** next: the first user-visible fix (second-half change requests), and all season rules in one place.
3. **US3 (BAD-392)**: ranking lookups; can be built in parallel with US2 after US1 is merged.
4. Polish tasks land with the last story's PR.
