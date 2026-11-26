# Feature Specification: Season and Ranking Reference-Date Groundwork

**Feature Branch**: `docs/s3-groundwork-spec` (spec); implementation branches per ticket off `feat/refactor`
**Created**: 2026-11-17
**Status**: Draft
**Tickets**: BAD-390 (US1), BAD-391 (US2), BAD-392 (US3); parent BAD-362
**Input**: User description: "S3 groundwork for the business-rules refactor: give the backend one explicit, tested home for season concepts and for the ranking reference date / 'ranking at date X' lookup, keeping current behaviour except for named bug fixes."

## Domain context

This section records the rules the groundwork touches, where they come from, and where they live in the code today. Source: the Badminton Vlaanderen regulations at https://badminton.vlaanderen/reglementen/ (versions as published on 2026-11-17).

### Glossary

| Term | Meaning | Source |
| --- | --- | --- |
| **Season number** | A season is identified by the year it starts in: season 2026 is 2026–27. | Convention used throughout Badman |
| **Competition season** | The period in which interclub encounters are played: 1 September up to and including 30 April. | C320 art. 1§2 |
| **First half / second half** (heenronde / terugronde) | First half: 1 September – 31 December. Second half: 1 January – 30 April. The home and away encounter between two teams are played in different halves. The date the encounter is actually played decides its half (Badminton Vlaanderen, BAD-397). | C320 art. 20§3, 26§5 |
| **Badminton season** | The federation's administrative year: 1 August – 31 July. | C100 art. 104 |
| **Transfer / loan effective date** | Transfers and loans take effect on 1 July following the request period. | C925, C950 |
| **Enrollment deadline** | Teams enroll for the next competition season by 15 May. Series are published by 15 June, the definitive calendar on 25 August. | C320 art. 21§1, 26§1–4 |
| **Enrollment year switch** | The date from which "the current season" means the upcoming season for enrollment purposes. Badman uses 1 May. This is a practical choice, not a regulation. | Code only |
| **Level** (klassement) | A player's level per discipline (singles, doubles, mixed), from 1 (highest) to 12 (lowest). | C700 art. 707 |
| **Evaluation** | Levels are re-evaluated on the first Monday of each month and take effect immediately. | C700 art. 713 |
| **Publication** | A ranking snapshot published by the federation (weekly). Some publications carry level changes (update publications, stored as `updatePossible`); the others only reorder players. | C700 art. 713–714; ranking sync |
| **Ranking system** | A set of ranking rules and publications (for example the Flemish system). A player has places in several systems; every lookup must name the system. | Badman data model |
| **Enrollment ranking** (inschrijvingsklassement, discipline index) | The level from the May ranking before the competition season. It fixes base teams, team indexes, division placement and eligibility for the whole season. A level change during the season does not change it. | C320 art. 51§1, 55§2 |
| **Ranking on the day of the encounter** (opstellingsindex) | The level on the day of an encounter. It decides the order of players and pairs in a line-up. | C320 art. 51§2, 55§1 |
| **Team index** | The sum of the enrollment-ranking levels of the four base players (or titular players). | C320 art. 51§3–5 |
| **Change request** | A request to move an encounter to another date. Requests close on a deadline set per half on the event. The actual date decides which half an encounter is in; an encounter may move to the other half, as long as each opponent is still played once per half (Badminton Vlaanderen, BAD-397, 2026-11-19). Badman already allows the move: it warns, but does not block, when the proposed half already holds the return encounter. | C320 art. 28; Badminton Vlaanderen (BAD-397) |

### Rules and where they live today

| Concept | Rule | Current code | Matches? |
| --- | --- | --- | --- |
| Competition season window | 1 Sep – 30 Apr | `getSeasonPeriod` in `packages/utils/src/lib/comp.ts`; a copy in `encounter-change.service.ts` (`_isInCompetitionSeason`) | Yes (duplicated) |
| Halves | Year of the date = season → first half; season + 1 → second half | `date.getFullYear() === season` in `semester.rule.ts`, `team-club.rule.ts`, `change-encounter/.../encounter.service.ts` | Yes (scattered) |
| Change-request deadline per half | Period-1 deadline for first-half encounters, period-2 deadline for second-half encounters | `_assertDeadlineNotPassed` in `encounter-change.service.ts` treats both halves as period 1 | **No (bug)** |
| Season of a change request when the event has no season | Should follow the season concept | `event?.season ?? new Date().getFullYear()` in `encounter-change.service.ts` (wrong from January to April) | **No (bug)** |
| Enrollment year switch | 1 May | `getSeason` in `comp.ts`; seeders and seed builders repeat it | Yes (practical rule) |
| Season membership window | 1 Jul – 30 Jun (transfer/loan effective date to the day before the next one) | `startOfSeason` / `endOfSeason` in `comp.ts`; `transfers.service.ts`, `loans.service.ts.ts`, `player-club.rule.ts` | Yes (duplicated) |
| Season still open for score entry | Until 1 July of the following year, for pushing results to toernooi.nl (an encounter can exceptionally move to May, Badminton Vlaanderen in BAD-397) | `isSeasonOpen` / `oldestOpenSeason` in `apps/worker/sync/.../enter-scores/guards.ts` | Yes (separate implementation) |
| Next season | Switches on 1 October | `getNextSeason` in `comp.ts` (no production caller found) | Unclear purpose |
| Twizzit game export window | 1 Sep – 1 Sep of the next year | `game-export.service.ts` in `backend-twizzit` | Own rule |
| Seed data season | 1 May or 1 September switch | `database/seeders/**` | Inconsistent (test data only) |
| Enrollment ranking | May ranking before the season | Latest place up to **10 June** of the season start year, in four places (see US3) | **Differs** — question for the federation |
| Ranking on the day of the encounter | Level on the day of the encounter | Line-up check reads the player's latest place (`RankingLastPlace`) | Approximately (latest ≠ "on that day" for past encounters) |

## User Scenarios & Testing _(mandatory)_

The "users" of this groundwork are the developers who implement and change business rules, and indirectly every club secretary, captain and federation admin who relies on Badman applying the same season and ranking rules everywhere.

### User Story 1 - One named place for every season concept (Priority: P1)

A developer who needs to know "which season does this date belong to", "is this encounter in the first or second half" or "when does the season membership start" calls one shared, documented module. Each concept from the glossary has its own named function with its regulation reference, so nobody re-derives month cutoffs inline. The existing helpers keep working by delegating to the new module, so no caller changes yet.

**Why this priority**: Every other story builds on it. Without one source of truth, fixing the two change-request bugs (US2) or naming the ranking reference dates (US3) means adding yet another local rule.

**Independent Test**: Run the module's tests: every concept is checked on both sides of each boundary (the last moment before and the first moment of the cutoff day, in Brussels time) and across the turn of the year. Run the existing test suites unchanged: they still pass because the old helpers delegate.

**Acceptance Scenarios**:

1. **Given** 30 April 2027 23:59 Brussels time, **When** a developer asks whether it falls in competition season 2026, **Then** the answer is yes; for 1 May 2027 00:00 the answer is no.
2. **Given** 31 December 2026 and 1 January 2027, **When** a developer asks which half of season 2026 they fall in, **Then** the answers are "first half" and "second half".
3. **Given** 30 April 2027 and 1 May 2027, **When** a developer asks for the current enrollment season, **Then** the answers are 2026 and 2027.
4. **Given** 30 June 2027 and 1 July 2027, **When** a developer asks for the season membership window start, **Then** the answers place the dates in season 2026 and 2027.
5. **Given** any input previously handled by `getSeason`, `getSeasonPeriod`, `startOfSeason`, `endOfSeason` or `getNextSeason`, **When** the same input goes through the delegating helper, **Then** the result is identical to before.

---

### User Story 2 - Every caller uses the module, and two change-request bugs are fixed (Priority: P2)

Every place in the backend that works out a season, a half or a season window uses the module from US1. That includes the change-request flow, the sync worker, the Twizzit export, enrollment validation, the player resolver, the seeders and the test builders. Along the way, two bugs in the change-request flow are fixed:

- **Second-half deadline**: a club requesting a date change for a second-half encounter is checked against the period-2 deadline, not the period-1 deadline. Today every second-half request is rejected as soon as the period-1 deadline has passed.
- **Calendar-year fallback**: when an event has no season, the change-request flow derives the season from the season concept instead of the calendar year, so January–April requests no longer land in the wrong season.

**Why this priority**: It removes the duplicated rules (the actual source of drift) and fixes a bug that blocks clubs from requesting second-half changes. It depends on US1.

**Independent Test**: Search the backend for month or year comparisons used to derive a season: none remain outside the module. Run the change-request tests: second-half encounters are accepted before the period-2 deadline and rejected after it; first-half behaviour is unchanged; an event without a season in February resolves to the season that started the previous September.

**Acceptance Scenarios**:

1. **Given** an event with period-1 deadline 1 December 2026 and period-2 deadline 1 March 2027, and today is 15 January 2027, **When** a club requests a change for an encounter on 20 February 2027, **Then** the request is accepted.
2. **Given** the same event and today is 2 March 2027, **When** a club requests a change for an encounter on 20 March 2027, **Then** the request is rejected with the existing deadline error.
3. **Given** the same event and today is 2 December 2026, **When** a club requests a change for an encounter on 15 December 2026, **Then** the request is rejected with the existing deadline error (unchanged behaviour).
4. **Given** an event without a season and today is 10 February 2027, **When** the change-request flow needs the season, **Then** it uses season 2026.
5. **Given** the seeders run, **When** they create season data, **Then** they use the same season concepts as the application.

---

### User Story 3 - One ranking reference date per concept and one ranking lookup (Priority: P3)

A developer who needs "a player's level for season X" or "a player's level on date Y" uses one named reference-date function per ranking concept (enrollment ranking, ranking on the day of the encounter) and one lookup for "a player's place at date X for ranking system Y". Each current caller keeps its exact current rule, now passed explicitly, so the differences become visible and testable instead of hidden in four queries. Two bugs are fixed:

- **Sync worker without a ranking system**: when the sync worker stores enrollment levels, it looks up the latest place without filtering on the ranking system, so it can pick up a place from the wrong system.
- **Line-up player cache**: the line-up check caches players by player id only, so a second check within the cache lifetime for another season or ranking system reuses the wrong levels.

The current rules per caller:

| Caller | Reference date | Publications considered | Ranking system |
| --- | --- | --- | --- |
| Enrollment team index | latest place up to 10 June of the season start year | all | filtered |
| Line-up export | latest place up to 10 June of the season start year | update publications only | filtered |
| Line-up check (eligibility) | latest place within the month configured on the event (in practice May) | update publications only | filtered |
| Sync worker (entries) | latest place up to 10 June of the season start year | all | **not filtered (bug)** |

**Why this priority**: The ranking rules are the core of the S3 domain sessions (team index, divisions, eligibility). Naming them first makes the later rule changes small and safe. It depends on US1 only for shared date handling.

**Independent Test**: Run the lookup's tests against fixed publication data: for each caller rule, the expected place is returned, including a publication dated exactly on the reference date and a player with places in two ranking systems. Run the existing enrollment, line-up and sync tests unchanged.

**Acceptance Scenarios**:

1. **Given** a player with places on 2 May, 6 June and 13 June 2026 in system A, **When** the enrollment rule for season 2026 is applied, **Then** the 6 June place is returned (current behaviour kept).
2. **Given** the same player with a place on 10 June 2026, **When** the enrollment rule is applied, **Then** the 10 June place is returned (a publication dated on the reference date counts, as today).
3. **Given** a player with a newer place in system B than in system A, **When** the sync worker stores enrollment levels for system A, **Then** the system A place is used.
4. **Given** the line-up check has validated a team for season 2025 and system A, **When** it validates a team for season 2026 or system B within the cache lifetime, **Then** it uses levels for that season and system.
5. **Given** a player without any place before the reference date, **When** any caller rule is applied, **Then** the result is "no place", exactly as each caller handles it today.

---

### Edge Cases

- **Midnight and timezones**: dates near midnight on a cutoff day must resolve in Brussels time for season and half concepts. A server running in UTC must give the same answer as one running in Brussels.
- **Publication dates**: publications are stored at midnight of their calendar date. A publication dated on the reference date itself must be included exactly as it is today, whatever timezone the server runs in.
- **Leap years and month ends**: 29 February and 30/31 day months must not shift any window.
- **Encounters outside the competition season** (an encounter that exceptionally moves to May, or one played on 31 August; Badminton Vlaanderen in BAD-397): half detection and score-entry season open/close keep their current results.
- **Event without change-request deadlines**: the deadline check keeps skipping, as today.
- **Encounter without a date**: callers that skip undated encounters today keep doing so.
- **Line-up month setting missing or set in weeks or days**: the line-up check keeps its current behaviour (it throws when the setting is missing).
- **Player without a place for the system**: callers keep returning "no place" or the fallback they use today.

## Requirements _(mandatory)_

### Functional Requirements

**Season concepts (US1)**

- **FR-001**: The backend MUST offer one shared module with a named function for each concept in the glossary that the code uses: competition season window, half of the season, enrollment season (1 May switch), season membership window (1 July – 30 June), score-entry season open and oldest open season (1 July close), next season (1 October switch), and the Twizzit export window.
- **FR-002**: Each function MUST document its rule and its regulation reference, or state that it is a practical rule without a regulation.
- **FR-003**: The module MUST interpret calendar dates in the Europe/Brussels timezone, independent of the server timezone.
- **FR-004**: The existing helpers (`getSeason`, `getSeasonPeriod`, `startOfSeason`, `endOfSeason`, `getNextSeason`) MUST return exactly what they return today, by delegating to the module, until US2 removes them.
- **FR-005**: Every function MUST be covered by tests on both sides of each boundary and across the turn of the year.

**Callers (US2)**

- **FR-006**: No backend code outside the module MAY derive a season, a half or a season window from month or year comparisons. This covers production code, seeders and test builders.
- **FR-007**: The change-request deadline check MUST use the period-1 deadline for first-half encounters and the period-2 deadline for second-half encounters, where the half is that of the encounter's current date (an encounter moving to the other half is checked against the deadline of the half it leaves; see open question 6).
- **FR-008**: When an event has no season, the change-request flow MUST derive the season from the season concept, not from the calendar year.
- **FR-009**: The old helpers in `comp.ts` MUST be removed once no caller uses them.
- **FR-010**: Apart from FR-007, FR-008 and the timezone change below, every migrated caller MUST keep its current results.
- **FR-010a**: Timezone independence: when a caller derives a season or a half from an instant, it uses the Brussels calendar date explicitly (FR-003), and instants written to or compared with the database are midnight in Brussels. Production already runs with `TZ=Europe/Brussels`, so this does not change production results; it makes them independent of the server timezone (research R1, R2 and R3). Only a process running in another timezone (for example UTC in CI) sees different answers than before, for instants between 22:00/23:00 UTC and midnight UTC on a boundary day.

**Ranking reference dates (US3)**

- **FR-011**: The backend MUST offer one named reference-date function for the enrollment ranking and one for the ranking on the day of an encounter, each documenting its regulation reference.
- **FR-012**: The backend MUST offer one lookup that returns a player's latest place on or before a given date, for a given ranking system, optionally restricted to update publications.
- **FR-013**: Each current caller (enrollment team index, line-up export, line-up check, sync worker entries) MUST use the shared reference-date function and lookup, passing its current rule explicitly, and MUST return the same places as today.
- **FR-014**: The sync worker MUST filter on the ranking system when it looks up enrollment levels.
- **FR-015**: The line-up check MUST NOT reuse cached player levels across seasons or ranking systems.
- **FR-016**: The differences between the current rules and the regulations MUST be recorded as open questions for Badminton Vlaanderen (see below), not resolved in this feature.

**General**

- **FR-017**: The GraphQL schema MUST NOT change.
- **FR-018**: Tests MUST be written before the change they cover; for the bug fixes, a failing test MUST demonstrate the bug first.
- **FR-019**: Before any caller changes, the current behaviour of every season and ranking-date function this feature touches MUST be pinned by characterization tests (BAD-409), including the named bugs. The tests run in Europe/Brussels, the timezone production uses; the old season helper suite also runs in UTC to show which answers depend on the server. Once a caller uses the module (US2, US3), its season tests MUST also run in UTC with the same results.

### Key Entities

- **Season**: identified by its start year; has a competition window, two halves, an enrollment switch date and a membership window.
- **Ranking system**: the set of publications a place belongs to.
- **Publication / place**: a player's level per discipline at a publication date, flagged when it is an update publication.
- **Event (competition)**: has a season, two change-request deadlines (one per half) and a configured line-up ranking month.
- **Encounter**: has a date that places it in a half of its event's season.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Season rules live in one place: 0 month or year comparisons that derive a season remain outside the module (down from about 10 places today).
- **SC-002**: Ranking reference dates live in one place: 0 hard-coded "10 June" or "May" cutoffs remain outside the shared functions (down from 4 places today).
- **SC-003**: Clubs can request date changes for second-half encounters until the period-2 deadline: 100% of such requests made between the period-1 and period-2 deadlines are accepted, where today 0% are.
- **SC-004**: Every season and ranking-reference boundary is covered by an automated test on both sides.
- **SC-005**: Existing behaviour is preserved: all existing test suites pass without changing their expectations, except the tests that pin the named bugs.
- **SC-006**: The open questions below are handed to Badminton Vlaanderen as question comments on Linear tickets BAD-397 to BAD-408, and BAD-423 for question 6.
- **SC-007**: The characterization tests from FR-019 pass unchanged after US1, US2 and US3, except the tests that pin the named bugs, which change on purpose. The suites of migrated callers also pass in UTC (FR-010a).

## Open questions for Badminton Vlaanderen

These are answered outside this feature; the answers drive later S3 work.

1. **Enrollment ranking date**: C320 art. 51§1 says the May ranking. Badman uses the latest ranking up to 10 June, which normally includes the June evaluation. Which one is correct, and was 10 June ever the rule?
2. **Update publications**: for the enrollment ranking, should only update publications count (as the line-up export and check do), or all publications (as the team index does)?
3. **Players without a ranking on the reference date** (new or returning players): which level applies for the season? C700 art. 707.3 says a first-time player starts at 12, and art. 717 covers returning players.
4. **Ranking on the day of the encounter**: for an encounter validated after it was played, should the line-up order use the level on the encounter date or the current level?
5. **National competition (C300)**: is it in scope for Badman's season rules? Its periods differ (encounters between 1 September and 15 April; qualification September–December, finals February–March).
6. **Change-request deadlines**: when an encounter moves to the other half, which half's deadline applies, the half it leaves (Badman after FR-007; before that, the period-1 deadline for both halves) or the half it moves to? And after the deadline for new requests, may a club still accept or finalise a request until the deadline for accepted requests (`changeCloseDatePeriod1/2`, stored but not used today)? Asked in BAD-423.

## Assumptions

- Current behaviour is what production computes: the API and the workers run with `TZ=Europe/Brussels` on Render (checked 2026-11-25, research R1). The BAD-409 tests pin it by running in that timezone.
- Publication dates are stored at midnight of their calendar date by the ranking sync.
- The line-up month setting on events is "months" with an amount that points to May in production data; verified on a production dump during planning.
- `getNextSeason` and the Twizzit window are kept as-is and documented; whether they are still needed is not decided here.
- The seeders keep producing equivalent data; switching them to the module may shift seed dates at most within the same season.
- Removing moment (BAD-380) is out of scope, but every date operation this feature writes or edits uses date-fns. moment stays installed, and code this feature does not touch keeps using it until BAD-380.
- The S1 tickets (dead code removal) may land on `feat/refactor` before implementation starts; callers removed there are out of scope here.
