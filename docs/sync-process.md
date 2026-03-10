# Sync Process Architecture

This document describes how the event/encounter sync process works end-to-end, including Render orchestration, the processing pipeline, and test coverage.

---

## Table of Contents

1. [Overview](#overview)
2. [What Triggers Sync to Start](#what-triggers-sync-to-start)
3. [What Causes Sync to Stop / Suspend](#what-causes-sync-to-stop--suspend)
4. [The Sync Flow](#the-sync-flow)
5. [Check Encounters Flow](#check-encounters-flow)
6. [Enter Scores Flow](#enter-scores-flow)
7. [Test Coverage](#test-coverage)

---

## Overview

The sync system consists of two separate processes:

- **API Server** (`apps/api`) — runs the orchestrators and cron scheduler, monitors Bull queues, controls Render service lifecycle
- **Sync Worker** (`apps/worker/sync`) — processes queued jobs, connects to external APIs (toernooi.nl), updates the database

Communication between them happens via **Redis/Bull queues**. The API queues jobs; the worker consumes them. The API monitors queue depth and starts/stops the worker on Render accordingly.

### Key Infrastructure

| Component | Location |
|-----------|----------|
| Orchestrator base | `libs/backend/orchestrator/src/orchestrators/base.orchestrator.ts` |
| Sync orchestrator | `libs/backend/orchestrator/src/orchestrators/sync.orchestrator.ts` |
| Render service | `libs/backend/orchestrator/src/services/render.service.ts` |
| Cron scheduler | `libs/backend/orchestrator/src/crons/cron.ts` |
| Queue definitions | `libs/backend/queue/src/queues.ts` |
| Sync job events | `libs/backend/queue/src/events/sync.ts` |
| Transaction manager | `libs/backend/queue/src/services/transaction-manger.service.ts` |
| Worker entry point | `apps/worker/sync/src/main.ts` |
| Worker module | `apps/worker/sync/src/app/app.module.ts` |
| Idle shutdown | `apps/worker/sync/src/app/services/idle-shutdown.service.ts` |

---

## What Triggers Sync to Start

### 1. Cron Jobs (automatic)

Cron jobs are stored in the database (`CronJob` model) and loaded by `CronService.onModuleInit()` on API startup. Each cron job has:

- `cronTime` — standard cron expression (e.g., `5 6 * * *`)
- `type` — `"sync"` or `"ranking"`
- `meta.jobName` — the Bull job name (e.g., `Sync.SyncEvents`)
- `meta.arguments` — job payload
- `active` — whether the job is enabled

On each cron tick, the service:
1. Checks if the same job is already active/waiting in the queue (prevents duplicates)
2. If not, adds the job to the Bull queue with `{ attempts: 3, backoff: { type: "exponential", delay: 30000 } }`
3. Updates the `CronJob.lastRun` timestamp

Timezone: **Europe/Brussels** for all cron expressions.

### 2. Manual Trigger (user-initiated)

Users with `change:job` permission can queue jobs via:

```
POST /queue-job
{
  "job": "SyncEvents",
  "queue": "sync",
  "jobArgs": { "eventId": "abc-123" }
}
```

This immediately adds the job to the Bull queue.

### 3. Render Orchestration (starting the worker)

The `OrchestratorSync` runs a `@Cron("*/1 * * * *")` check (every minute) in the API:

1. Reads job counts from the `SyncQueue` (waiting + active)
2. If jobs exist and worker is not running:
   - Looks up the `Service` record (name=`"sync"`) to get `renderId`
   - Calls `POST https://api.render.com/v1/services/{renderId}/resume`
   - Updates service status to `"starting"`
   - Emits `SERVICE_STARTING` WebSocket event
3. Render spins up the worker service

When the worker starts (`WorkerSyncModule.onApplicationBootstrap`):
- Sets `Service.status = "started"` in DB
- Emits `SERVICE_STARTED` WebSocket event
- Resets all sync `CronJob.amount` counters to 0
- Bull consumers connect to Redis and start processing jobs

### Environment gating

In `development` and `test` environments, all Render API calls are no-ops (skipped). The orchestrator only makes real API calls in `production` and `staging`.

---

## What Causes Sync to Stop / Suspend

### 1. Orchestrator-Driven Suspension

When the queue has been empty for `RENDER_WAIT_TIME` (default: 35 minutes):

1. `OrchestratorSync.checkQueue()` detects no waiting/active jobs
2. Checks elapsed time since last activity
3. If idle >= `RENDER_WAIT_TIME`:
   - Calls `POST https://api.render.com/v1/services/{renderId}/suspend`
   - Updates service status to `"stopped"`
   - Emits `SERVICE_STOPPED` WebSocket event

### 2. Idle Shutdown Service (resource cleanup)

The `IdleShutdownService` in the worker monitors queue activity independently:

- Default timeout: 30 minutes (`WORKER_IDLE_TIMEOUT_MS`)
- Resets on any `active` or `waiting` queue event
- When idle timeout fires:
  - Double-checks for active/waiting jobs (prevents false alarm)
  - Closes the Puppeteer browser to free memory
  - Does **not** shut down the process — Render handles suspension

### 3. Render Auto-Suspend

Render may also suspend the service based on its own inactivity detection, independent of the orchestrator.

---

## The Sync Flow

### Pipeline: Event → SubEvent → Draw → Encounter → Game → Standing

The v2 sync pipeline (`apps/worker/sync/src/app/processors/sync-events-v2/`) uses a **scheduler/processor pattern** with database transactions.

#### Transaction Pattern

Every sync operation follows this flow:

```
Scheduler
  ├─ Creates a Sequelize transaction (via TransactionManager)
  ├─ Queues a Processor job with the transactionId
  ├─ Polls every 3 seconds until all child jobs finish
  └─ On completion:
     ├─ All succeeded → commit transaction
     └─ Any failed → rollback transaction
```

The `TransactionManager` (`libs/backend/queue/src/services/transaction-manger.service.ts`) tracks which Bull jobs belong to which transaction, so it knows when the whole tree is done.

#### Step-by-Step Pipeline

**Step 1: Event** (`ProcessSyncCompetitionEvent`)
- Input: `eventCode` (visual code from toernooi.nl)
- Fetches tournament metadata from `VisualService`
- Creates/updates `EventCompetition` record (name, season, visualCode, lastSync)
- **Gate**: If event enlisting is still open (between openDate and closeDate), stops here
- Otherwise: queues `ProcessSyncCompetitionSubEvent` for each sub-event

**Step 2: SubEvent** (`ProcessSyncCompetitionSubEvent`)
- Fetches sub-event details from `VisualService`
- Creates/updates `SubEventCompetition` (name, eventType M/F/MX, visualCode)
- Assigns ranking groups if event is official
- Queues `ProcessSyncCompetitionDraw` for each draw

**Step 3: Draw** (`ProcessSyncCompetitionDraw`)
- Fetches draw details with game data from `VisualService`
- Creates/updates `DrawCompetition` (name, size, type: KO/POULE/QUALIFICATION)
- Queues `ProcessSyncCompetitionEncounter` for each encounter
- Queues `ProcessSyncCompetitionDrawStanding` if standings need updating

**Step 4: Encounter** (`ProcessSyncCompetitionEncounter`)
- Fetches encounter from `VisualService`
- Creates/updates `EncounterCompetition` (visualCode, teams)
- Queues `ProcessSyncCompetitionGame` for each game/match
- Queues standing calculation if needed

**Step 5: Game** (`ProcessSyncCompetitionGame`)
- Fetches game details from `VisualService`
- Determines game status (Normal, Walkover, Retirement, Disqualified, No Match)
- Updates `Game` record (round, order, scores, status, playedAt, winner)
- **Preservation logic**: Only updates fields if new data exists OR field was null (prevents overwriting manually corrected data)
- Creates `GamePlayerMembership` records (links players to game, stores ranking at time of play)
- Calculates ranking points via `PointsService`
- **Skip logic**: If game already had a winner, player memberships are not recreated

**Step 6: Standing** (`ProcessSyncCompetitionDrawStanding`)
- Waits for all game jobs to complete (receives `gameJobIds`)
- Calculates standings per draw: played, won, lost, tied, points
- Aggregates game-level stats: gamesWon/Lost, setsFor/Against, totalPointsWon/Lost
- Sorts standings and assigns positions
- Sets riser/faller flags based on draw configuration

#### Options Object

Every processor receives an `options` object controlling behavior:

```typescript
{
  deleteEvent?: boolean;
  deleteSubEvent?: boolean;
  deleteDraw?: boolean;
  deleteEncounters?: boolean;
  deleteMatches?: boolean;
  deleteStandings?: boolean;
  updateSubEvents?: boolean;
  updateDraws?: boolean;
  updateMatches?: boolean;
  updateStanding?: boolean;
}
```

This allows selective sync (e.g., only update matches without recalculating standings).

#### ID Preservation

When deleting and recreating records, the pipeline reuses existing database IDs. Parent processors pass down known child IDs to maintain referential integrity.

#### Error Handling

- `GlobalConsumer` (`apps/worker/sync/src/app/processors/global.ts`) listens for queue-wide events:
  - `stalled` — job took too long, logged as warning
  - `error` — queue-level error
  - `failed` — detailed failure log with job ID, name, data, attempt count, stack trace
- Bull retries failed jobs up to 3 times with exponential backoff (30s → 60s → 120s)
- Transaction rollback on any child job failure

---

## Check Encounters Flow

Separate from the sync pipeline, the **Check Encounters** cron uses Puppeteer to verify encounter acceptance status on toernooi.nl.

**Processor**: `CheckEncounterProcessor` (`apps/worker/sync/src/app/processors/check-encounters/check-encounters.processor.ts`)

### Batch Processing (`Sync.CheckEncounters`)

1. Queries encounters from the last 14 days that are not yet accepted and have a valid visual code
2. Chunks into groups of 10
3. For each chunk:
   - Opens Puppeteer browser
   - For each encounter, navigates to the toernooi.nl encounter page
   - Extracts via `EncounterDetailPageService`:
     - Whether scores were entered (and when)
     - Whether encounter was accepted (and when)
     - Start/end times, shuttle info, game leader
     - Any comments
   - Determines action via `determineEncounterAction()` (in `guards.ts`):

| Condition | Action |
|-----------|--------|
| Has comment on toernooi.nl | `notify-has-comment` |
| Not entered, >24h since match | `notify-not-entered` |
| Not accepted, >48h since match | `notify-not-accepted` |
| Entered >36h ago, auto-accept enabled | `auto-accept` |
| Entered >36h ago, auto-accept disabled | `auto-accept-disabled` |
| Entered <36h ago | `auto-accept-too-early` |
| Everything fine | `none` |

4. Updates `EncounterCompetition` fields: `enteredOn`, `acceptedOn`, `accepted`, `startHour`, `endHour`, `shuttle`, `gameLeader`
5. Sends notifications as needed

### Single Encounter (`Sync.CheckEncounter`)

Same logic but for a single encounter by ID. Used for manual checks.

### Auto-Accept

When `VR_ACCEPT_ENCOUNTERS` is enabled and conditions are met:
1. Signs in to toernooi.nl using `VR_API_USER` / `VR_API_PASS`
2. Navigates to the encounter page
3. Clicks the accept button

---

## Enter Scores Flow

The **Enter Scores** job uses Puppeteer to submit match scores from Badman to toernooi.nl via browser automation.

**Processor**: `EnterScoresProcessor` (`apps/worker/sync/src/app/processors/enter-scores/enter-scores.processor.ts`)

### What Triggers It

An `EnterScores` job is queued from the `updateEncounterCompetition` GraphQL mutation (`libs/backend/graphql/src/resolvers/event/competition/encounter.resolver.ts`) when all three conditions are met:

1. `encounter.finished === true` — the encounter is marked complete
2. `encounter.enteredOn != null` — scores have been entered in Badman
3. `encounter.scoresSyncedAt == null` — scores haven't been synced to toernooi.nl yet

Job config: 3 attempts, exponential backoff starting at 60s, `removeOnComplete: true`, `removeOnFail: false` (kept for debugging).

### Step-by-Step Flow

1. **Preflight checks** — validates `VISUAL_SYNC_ENABLED` or `ENTER_SCORES_ENABLED` is true, and VR API credentials are configured
2. **Launch browser** — Puppeteer in headless mode (unless `VISUAL_SYNC_ENABLED` for debugging)
3. **Load encounter data** — fetches encounter with games, players, teams, assembly, draw/sub-event/event (for visual codes)
4. **Accept cookies** on toernooi.nl (non-fatal if timeout)
5. **Sign in** with `VR_API_USER` / `VR_API_PASS`
6. **Navigate to edit mode** — `toernooi.nl/sport/matchresult.aspx?id={eventId}&match={matchId}`
7. **Clear all fields** — clicks reset button, confirms, waits 5s
8. **Enter games** (within a DB transaction):
   - Matches games to assembly positions based on player assignments
   - For each game in assembly order:
     - Selects 4 players from dropdowns
     - Enters set scores (up to 3 sets)
     - Enters winner status
     - Saves `visualCode` to DB
   - For mixed doubles: ensures correct male/female player ordering
9. **Enter optional fields** — game leader, shuttle count, start/end hour
10. **Trigger form validation** — clicks input to activate browser-side validation
11. **Check for errors** — extracts `div.submatchrow_message` error messages; throws if any found
12. **Save** (only in production or when `ENTER_SCORES_ENABLED`):
    - Clicks save button
    - Waits for navigation (45s timeout, with network-idle fallback)
    - Verifies post-save state (URL changed, no error messages)
13. **On success**: sets `encounter.scoresSyncedAt = new Date()` and sends success email
14. **On failure**: sends failure email only on final attempt (prevents spam), re-throws for Bull retry
15. **Cleanup**: closes browser page

### Game Matching Logic

Games are matched to form rows by assembly position, not by order. The system:
- Extracts player IDs from home/away team assembly data
- For each assembly position (e.g., HD1, DD1, HE1): finds the game containing those exact players
- Handles different ordering for M (men's), F (women's), and MX (mixed) team types

### Key Detail: `scoresSyncedAt`

This is the **only place** in the entire codebase that sets `scoresSyncedAt` to a non-null value. This field is used as a guard to prevent double-syncing and is the basis for the "Retry Failed Encounter Sync" feature.

### Configuration

| Variable | Purpose |
|----------|---------|
| `VISUAL_SYNC_ENABLED` | Show browser window (non-headless) for debugging |
| `ENTER_SCORES_ENABLED` | Allow save button click in non-production |
| `VR_API_USER` / `VR_API_PASS` | toernooi.nl credentials |
| `DEV_EMAIL_DESTINATION` | Email for success/failure notifications |
| `HANG_BEFORE_BROWSER_CLEANUP` | Keep browser open after completion for debugging |

---

## Test Coverage

### What IS Tested

| File | What's tested |
|------|--------------|
| `processors/check-encounters/__tests__/check-encounters.processor.spec.ts` | Batch + single encounter processing, detail updates, notifications, auto-accept, browser lifecycle, error handling |
| `processors/check-encounters/__tests__/guards.spec.ts` | `determineEncounterAction()` — all action conditions |
| `processors/enter-scores/__tests__/guards.spec.ts` | `enterScoresPreflight` and `isFinalAttempt` guard logic |
| `processors/enter-scores/__tests__/enter-scores.processor.spec.ts` | Automated score entry via browser |
| `processors/sync-events/__tests__/sync-events.processor.spec.ts` | V1 sync events processor |
| `processors/sync-events/competition-sync/processors/__tests__/encounter-location-utils.spec.ts` | `matchesAvailabilityWindow()` — day/time matching (±15 min) |
| `processors/sync-ranking/__tests__/ranking-utils.spec.ts` | `isPublicationUsedForUpdate()` — publication date filtering |
| `processors/change-date/__tests__/change-date-utils.spec.ts` | `formatEncounterDateForApi()` — CET/CEST timezone conversion |
| `processing/__tests__/process-step.spec.ts` | `ProcessStep` class — async execution, data storage, stop conditions |
| `processing/__tests__/processor.spec.ts` | `Processor` class — step pipeline, overrides |
| `utils/__tests__/correctWrongTeams.spec.ts` | Team name normalization (suffix stripping, replacements) |
| `utils/__tests__/lock-renewal.spec.ts` | `startLockRenewal()` — periodic lock extension |
| `utils/__tests__/mapWinnerValues.spec.ts` | Winner value mapping between internal/external codes |
| `utils/__tests__/timeUnits.spec.ts` | Millisecond conversion to days/hours/minutes/seconds |
| `queue/__tests__/queue.integration.spec.ts` | Bull queue lifecycle, retries, concurrency |

### What is NOT Tested

- **Sync-events-v2 pipeline** — None of the v2 processors (Event, SubEvent, Draw, Encounter, Game, Standing) have unit tests
- **TransactionManager** — commit/rollback flows not tested
- **OrchestratorBase** — Render API interaction not tested
- **CronService** — job scheduling logic not tested
- **IdleShutdownService** — timeout and cleanup logic not tested
- **RenderService** — API calls not tested
- **DrawStandingCompetitionProcessor** — standing calculation not tested

The biggest gap is the v2 processor pipeline — the core sync logic has no direct test coverage.
