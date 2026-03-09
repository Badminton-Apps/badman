# Worker-Sync Test Plan

## Context

The worker-sync app handles syncing badminton encounter data to toernooi.nl. This involves Bull queue job processing, headless browser automation (Puppeteer), HTTP API calls (VisualService), database transactions, and notification/mailing services.

Due to the number of moving parts, the sync has been fragile. This plan outlines a phased approach to add automated tests, starting with what's easiest to test and most impactful.

---

## Architecture Overview

```
Bull Queue (Redis)
  └─ Processors (@Process decorators)
       ├─ SyncEventsProcessor    — fetch & sync event data from toernooi.nl API
       ├─ EnterScoresProcessor   — headless browser: enter scores on toernooi.nl
       ├─ CheckEncounterProcessor— headless browser: check encounter status
       ├─ SyncRankingProcessor   — sync ranking data
       ├─ SyncTwizzitProcessor   — sync Twizzit data
       └─ v2 Processors          — granular tournament/competition sync jobs
            ├─ Schedulers (enqueue child jobs)
            └─ Processors (execute child jobs)

Each processor depends on some combination of:
  - VisualService (HTTP API to toernooi.nl)
  - Puppeteer (headless Chromium)
  - Sequelize (PostgreSQL + transactions)
  - NotificationService / MailingService
  - CronJob model (duplicate execution guards)
  - Bull Job object (progress, lock renewal, attempts)
```

## Existing Infrastructure

| Asset | Location | Notes |
|---|---|---|
| Jest config | `apps/worker/sync/jest.config.ts` | Already configured |
| Test tsconfig | `apps/worker/sync/tsconfig.spec.json` | Already configured |
| Test env | `.env.test` | Environment separation |
| Test builders | `libs/backend/database/src/_testing/` | Fluent builders for EventCompetition, Game, Player, Team, etc. |
| redis-memory-server | `devDependencies` | In-memory Redis for queue tests |
| NestJS testing | `@nestjs/testing` | `Test.createTestingModule()` pattern used elsewhere |

---

## Phase 1: Unit Tests (Pure Logic, No Infrastructure)

**Goal:** Test business logic that has zero external dependencies. Fast, stable, high confidence.

**Effort:** Low
**Impact:** Medium — catches logic bugs, builds foundation for later phases.

### 1.1 Processor/ProcessStep Framework

**Files:** `apps/worker/sync/src/app/processing/processor.ts`, `process-step.ts`

**What to test:**
- Steps execute in insertion order
- A step returning `stop: true` halts subsequent steps
- Errors in a step propagate correctly
- Timing data is recorded per step
- Empty processor (no steps) completes without error
- `addStep(step, override)` with override logic working correctly

**Mocking:** None — pure logic.

**✅ DONE:** 22 tests covering all Processor/ProcessStep behavior. Also fixed inverted override logic bug. See `apps/worker/sync/src/app/processing/__tests__/`

### 1.2 Lock Renewal

**Files:** Lock renewal utility (used in processors via `startLockRenewal` / `stopLockRenewal`)

**What to test:**
- `startLockRenewal` calls `job.extendLock()` on the configured interval
- `stopLockRenewal` clears the interval
- Handles `extendLock` throwing (e.g., job already completed)

**Mocking:** Mock `job` object with `extendLock: jest.fn()`. Use `jest.useFakeTimers()`.

### 1.3 Utility / Helper Functions

**What to test:**
- `timeUnits()` — millisecond breakdown and formatting
- `mapWinnerValues()` and `reverseMapWinnerValue()` — winner value mapping
- `correctWrongTeams()` — team name normalization
- `startLockRenewal()` — lock extension interval and cleanup

**Mocking:** Mock `job.extendLock()` for lock renewal. Use `jest.useFakeTimers()`. Pure functions otherwise.

**✅ DONE:** 25 tests covering all utilities. See `apps/worker/sync/src/app/utils/__tests__/`

### 1.4 Individual ProcessStep Implementations (Data Transformation)

**Files:** Step classes inside `processors/sync-events/*/` and v2 processor steps

**What to test:**
- Given input data (events, matches, games), the step produces the correct output/mutations
- Edge cases: missing fields, duplicate entries, unexpected statuses

**Mocking:** Mock the injected services (VisualService, Sequelize models) to return canned data. Focus on testing the transformation logic, not the I/O.

---

## Phase 2: Service-Level Integration Tests (Mocked Externals)

**Goal:** Test each processor's `process()` method end-to-end with all external services mocked. Validates orchestration, error handling, and state transitions.

**Effort:** Medium
**Impact:** High — this is where most sync bugs live.

### 2.1 Mock Factories to Build

| Mock | Strategy |
|---|---|
| **Bull Job** | Plain object: `{ data: {...}, progress: jest.fn(), extendLock: jest.fn(), attemptsMade: 0, opts: { attempts: 3 } }` |
| **VisualService** | Jest mock class returning canned XML/parsed responses per method |
| **Puppeteer Page** | Mock object with `goto`, `waitForSelector`, `click`, `type`, `evaluate`, `$`, `$$` — return canned DOM results |
| **Sequelize transaction** | Mock with `commit: jest.fn()`, `rollback: jest.fn()` |
| **CronJob model** | Mock `findOne`/`update` controlling `running`, `lastRun`, `amount` |
| **NotificationService** | `jest.fn()` stubs |
| **MailingService** | `jest.fn()` stubs |

### 2.2 EnterScoresProcessor (Highest Priority)

**This is the most failure-prone processor and the primary pain point.**

**What to test:**
- Happy path: scores entered, page saved, encounter marked as `scoresSyncedAt`
- Score mapping: correct values filled into correct form fields
- Game leader and shuttle info entered correctly
- Navigation timeout handled gracefully (doesn't crash the job)
- Row validation errors detected and reported
- Transaction committed on success, rolled back on failure
- Email sent only on final attempt failure
- Job skipped when `ENTER_SCORES_ENABLED` is false
- Job skipped when encounter already has `scoresSyncedAt`

**Test setup:** Use `Test.createTestingModule` with mocked providers. Use test builders for encounter/game/player data.

### 2.3 CheckEncounterProcessor

**What to test:**
- Encounters from last 14 days fetched correctly
- Chunking into groups of 10
- Per-encounter checks: has time, is entered, is accepted
- Auto-accept when `VR_ACCEPT_ENCOUNTERS` is true and conditions met
- Notification sent at 24hrs (not filled in) and 48hrs+ (not accepted)
- Local DB updated with `enteredOn`, `acceptedOn`, times, shuttle, gameLeader
- Browser cleanup after each chunk

### 2.4 SyncEventsProcessor

**What to test:**
- Competition vs tournament routing based on event type
- Transaction per event — rollback on error doesn't affect other events
- Progress percentage tracks correctly across events
- Change-events mode vs search/ID mode
- CronJob `running` flag set/cleared correctly

### 2.5 v2 Scheduler/Processor Pairs

**What to test:**
- Scheduler enqueues correct child jobs with correct data
- Processor handles each job type correctly
- TransactionManager coordination across related jobs
- Delete/update option flags respected

---

## Phase 3: Queue Integration Tests (Real Redis)

**Goal:** Test Bull queue behavior — job lifecycle, concurrency, retries, stalling.

**Effort:** Medium-High
**Impact:** Medium — catches infrastructure-level bugs (stalling, duplicate execution, retry exhaustion).

### 3.1 Setup

- Use `redis-memory-server` to spin up an in-memory Redis per test suite
- Create a real Bull queue connected to in-memory Redis
- Register a minimal processor (or the real processor with mocked services)

### 3.2 What to Test

- **Job lifecycle:** enqueue → process → complete (happy path)
- **Job failure & retry:** processor throws → Bull retries up to `attempts` → final failure
- **Concurrency limit:** only 1 job processes at a time (`MAX_CONCURRENT_WORKER_JOBS: 1`)
- **Rate limiting:** max 1 job per 60 seconds (bounceBack behavior)
- **Stalling detection:** job exceeds lock duration → marked stalled → retried up to `maxStalledCount: 3`
- **Lock renewal prevents stalling:** long-running job that renews locks completes successfully
- **CronJob guard:** duplicate job submitted while one is running → skipped
- **Job progress:** `job.progress()` calls reflected in Bull's job state

### 3.3 Notes

- These tests will be slower (~seconds per test due to Redis and timers)
- Consider a separate Jest project or test suite for these
- Use `jest.setTimeout()` appropriately

---

## Phase 4: Browser Interaction Tests (Optional, High Cost)

**Goal:** Test actual Puppeteer interactions against controlled HTML pages.

**Effort:** High
**Impact:** Medium — catches selector/DOM structure regressions.

### 4.1 Prerequisite: Page Object Refactoring

Before this phase, refactor inline Puppeteer code into page-object classes:

```
// Before (current): scattered selectors in processor
await page.waitForSelector('#score-input-1');
await page.type('#score-input-1', score.toString());

// After: encapsulated in a page object
class EncounterFormPage {
  async enterScore(gameIndex: number, score: number) { ... }
  async clickSave() { ... }
  async getValidationErrors(): string[] { ... }
}
```

This makes the browser layer independently testable and mockable.

### 4.2 Test Setup

- Spin up a local Express server serving static HTML that mimics toernooi.nl form structure
- Launch real Puppeteer against `http://localhost:<port>`
- Test page-object methods against the controlled HTML

### 4.3 What to Test

- Score entry fills correct fields
- Save button triggers navigation
- Validation errors are detected
- Login flow works
- Timeout handling when page doesn't respond

### 4.4 Maintenance Consideration

These tests are coupled to toernooi.nl's HTML structure. When their site changes, both the page objects and the test HTML need updating. Keep the test HTML minimal — only the elements the code interacts with.

---

## Refactoring Recommendations

These are not required before starting Phase 1/2, but will improve testability and long-term stability.

### R1: Extract Page Objects from Processors

**Priority: High (prerequisite for Phase 4, simplifies Phase 2)**

**✅ DONE:** Extracted all Puppeteer interactions into injectable page-object services:

#### EnterScoresProcessor
**File:** `apps/worker/sync/src/app/processors/enter-scores/encounter-form-page.service.ts`

`EncounterFormPageService` — wraps `open`, `close`, `acceptCookies`, `signIn`, `waitForSignInConfirmation`, `enterEditMode`, `clearFields`, `enterGames`, `enterGameLeader`, `enterShuttle`, `enterStartHour`, `enterEndHour`, `enableInputValidation`, `getRowErrorMessages`, `getCurrentUrl`, `clickSaveButton`, `waitForNavigation`, `waitForNetworkIdle`.

#### CheckEncounterProcessor
**File:** `apps/worker/sync/src/app/processors/check-encounters/encounter-detail-page.service.ts`

`EncounterDetailPageService` — wraps `open`, `close`, `acceptCookies`, `gotoEncounterPage`, `consentPrivacyAndCookie`, `hasTime`, `getDetailEntered`, `getDetailAccepted`, `getDetailComment`, `signIn`, `acceptEncounter`, `getDetailInfo`.

Both processors now inject the page service via constructor, enabling full mock replacement in tests. Also migrated remaining `moment` usage in `check-encounters.processor.ts` to `date-fns`.

### R2: Extract Guard/Decision Logic into Pure Functions

**Priority: Medium**

**✅ DONE:** Extracted decision logic from two processors:

#### CheckEncounterProcessor
**File:** `apps/worker/sync/src/app/processors/check-encounters/guards.ts`

Extracted `determineEncounterAction()` with full notification/auto-accept decision tree:
- Comment notifications
- Not-entered/not-accepted notifications
- Auto-accept with timing and late-entry penalties
- Config-aware behavior (VR_ACCEPT_ENCOUNTERS flag)

12 unit tests cover all decision paths.

#### EnterScoresProcessor
**File:** `apps/worker/sync/src/app/processors/enter-scores/guards.ts`

Extracted preflight checks and retry logic:
- `enterScoresPreflight()` — credentials, headless mode, save decision
- `isFinalAttempt()` — determines if failure email should be sent

11 unit tests cover config combinations and retry edge cases.

### R3: Separate Data Fetching from Data Processing in SyncEventsProcessor

**Priority: Medium**

The processor currently fetches events and processes them in the same method. Splitting into `fetchEvents()` → `processEvents(events)` allows testing processing logic with fixture data, without mocking the HTTP layer.

### R4: Make TransactionManager a Proper Injectable

**Priority: Low (only needed for v2 processor tests)**

Ensure TransactionManager can be cleanly replaced in `Test.createTestingModule` for the v2 processors.

---

## Recommended Execution Order

| Order | What | Why | Status |
|---|---|---|---|
| 1 | Phase 1.1–1.3 | Quick wins, build testing muscle, no mocking complexity | ✅ DONE |
| 2 | Refactoring R2 | Extract guard logic — small refactor, big testability gain | ✅ DONE |
| 3 | Phase 3.1–3.2 | Queue integration — catches stalling/retry bugs | ✅ DONE |
| 4 | Refactoring R1 | Page objects — prerequisite for Phase 2 Puppeteer processors | ✅ DONE |
| 5 | Phase 2.2 | EnterScores is the #1 pain point | ✅ DONE |
| 6 | Phase 2.3 | CheckEncounters is the #2 pain point | 📋 Next |
| 7 | Phase 2.4 | SyncEvents covers the broadest surface area | 📋 Next |
| 8 | Phase 4 | Browser tests — only if selector regressions are a real problem | 📋 Next |

---

## Progress Summary

### Completed

| Phase | Tests | Coverage | Notes |
|---|---|---|---|
| 1.1 | ProcessStep/Processor | 22 | Fixed inverted override bug |
| 1.2 | Lock Renewal | 5 | Interval, cleanup, error handling |
| 1.3 | Utilities | 25 | timeUnits, mapWinnerValues, correctWrongTeams |
| R2 | Guard Logic | 23 | CheckEncounters (12) + EnterScores (11) |
| 3 | Queue Integration | 10 | Real Bull + redis-memory-server; job lifecycle, retries, concurrency, progress |
| R1 | Page Object Extraction | 0 new tests | `EncounterFormPageService` + `EncounterDetailPageService`; processors refactored to inject them |
| 2.2 | EnterScoresProcessor | 23 | Happy path, preflight, transaction rollback, row validation, nav timeout, failure email |
| **Total** | **102 tests** | **All passing** | 10 suites |

### Next: Phase 2.3 (CheckEncounterProcessor integration tests)

Phase 2.3 (CheckEncounterProcessor) is next — mock EncounterDetailPageService + CronJob model.

---

## Success Criteria

- **Phase 1 complete:** ✅ All pure logic functions have tests. 52 tests, all passing.
- **Phase 3 complete:** ✅ Queue behavior (retries, stalling, concurrency) is verified. 10 tests with real Bull + in-memory Redis.
- **Phase 2 complete:** Each processor has tests covering happy path, main error paths, and guard conditions. Regressions in sync logic are caught before deployment.
- **Phase 4 complete:** Browser interaction regressions are caught. toernooi.nl HTML changes are detected early.
