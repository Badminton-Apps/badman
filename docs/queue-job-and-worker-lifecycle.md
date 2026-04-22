# Queue-Job Endpoint & Worker Lifecycle

This document describes how to queue a background job via the API, and the full lifecycle by which workers on Render.com are started, run, and suspended.

---

## Table of Contents

1. [Overview](#overview)
2. [The `/api/v1/queue-job` Endpoint](#the-apiv1queue-job-endpoint)
3. [Payload Examples](#payload-examples)
4. [Worker Lifecycle](#worker-lifecycle)
5. [The Start Trigger](#the-start-trigger)
6. [The Stop Trigger](#the-stop-trigger)
7. [Scheduled Cron Jobs](#scheduled-cron-jobs)
8. [Release-Time Deploy Hooks](#release-time-deploy-hooks)
9. [Required Configuration](#required-configuration)
10. [File Reference Map](#file-reference-map)

---

## Overview

Two independent processes cooperate via a Redis-backed Bull queue:

- **API server** (`apps/api`) — accepts HTTP requests, queues jobs, and runs the orchestrator that starts/stops workers on Render.
- **Worker** (`apps/worker/sync`, `apps/worker/ranking`) — suspended by default; resumed on demand to consume queued jobs.

When a user POSTs to `/api/v1/queue-job`, the API only pushes the job into Redis. The worker itself is **not** woken up by the enqueue — a separate orchestrator in the API, running on a 1-minute cron, detects pending work and calls the Render API to resume the suspended worker service.

---

## The `/api/v1/queue-job` Endpoint

**Source:** `apps/api/src/app/controllers/app.controller.ts:37-137`

```ts
@Post("queue-job")
async getQueueJob(
  @User() user: Player,
  @Body()
  args: {
    job: string;
    queue: typeof SyncQueue | typeof RankingQueue;
    jobArgs: { [key: string]: unknown };
    removeOnComplete: boolean;
    removeOnFail: boolean;
  }
)
```

### Behavior

1. Authenticates the caller via JWT (unless the DEV-only bypass is active — see below).
2. Verifies the user has the `change:job` permission.
3. Injects `userId` into `jobArgs` before adding the job to the appropriate Bull queue.
4. Dispatches to either `SyncQueue` or `RankingQueue` based on `args.queue`.

### Request fields

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `job` | string | yes | — | Job name, e.g. `"UpdateRanking"` for ranking sync |
| `queue` | string | yes | — | Either `"ranking"` or `"sync"` (see `libs/backend/queue/src/queues.ts`) |
| `jobArgs` | object | yes | `{}` | Job-specific payload; `userId` is injected by the controller |
| `removeOnComplete` | boolean | no | `true` | Bull option |
| `removeOnFail` | number\|boolean | no | `50` | Bull option |

### DEV-only auth bypass

The endpoint also supports an unauthenticated path when all of the following hold (controller lines 52-78):

- `NODE_ENV === "development"`
- `DEV_ONLY_ALLOW_QUEUE_JOB_WITHOUT_AUTH === "true"`
- `DEV_ONLY_QUEUE_JOB_AS_PLAYER_ID` is set to a real player UUID with `change:job` permission

The logger emits a loud warning when this path is taken. In non-development `NODE_ENV`s, the bypass is hard-disabled.

---

## Payload Examples

### Ranking sync — minimal (uses all defaults)

```json
{
  "job": "UpdateRanking",
  "queue": "ranking",
  "jobArgs": {}
}
```

### Ranking sync — fully specified

```json
{
  "job": "UpdateRanking",
  "queue": "ranking",
  "jobArgs": {
    "systemId": "<ranking-system-uuid>",
    "recalculatePoints": true,
    "calculatePoints": true,
    "calculatePlaces": true,
    "calculateRanking": true,
    "fromDate": "2026-01-01",
    "toDate": "2026-04-22",
    "periods": 1
  },
  "removeOnComplete": true,
  "removeOnFail": 50
}
```

The shape of `jobArgs` for ranking sync is defined by `UpdateRankingJob` in `libs/backend/queue/src/events/ranking.ts`:

```ts
export interface UpdateRankingJob {
  systemId?: string;
  recalculatePoints?: boolean;
  calculatePoints?: boolean;
  calculatePlaces?: boolean;
  calculateRanking?: boolean;
  fromDate?: string;
  toDate?: string;
  periods?: number;
}
```

All fields are optional; omit them to let the ranking processor fall back to its own defaults.

---

## Worker Lifecycle

```
          POST /api/v1/queue-job
                │
                ▼
       ┌───────────────────┐
       │  API (NestJS)     │
       │  AppController    │──── BullQueue.add() ────► Redis
       └───────────────────┘
                │
                │  (no direct call to the worker)
                ▼
       ┌───────────────────┐
       │  Orchestrator     │   @Cron("*/1 * * * *")
       │  OrchestratorBase │   polls waiting/active counts
       └───────────────────┘
                │
                │  waiting>0 || active>0 ?
                ▼
       ┌───────────────────┐
       │  RenderService    │   POST /v1/services/{renderId}/resume
       └───────────────────┘
                │
                ▼
       ┌───────────────────┐
       │  Render.com       │   un-suspends the worker service
       └───────────────────┘
                │
                ▼
       ┌───────────────────┐
       │  Worker boots     │   connects to Redis, processes jobs
       │  (Bull consumer)  │
       └───────────────────┘
                │
                │  queue empty for RENDER_WAIT_TIME
                ▼
       RenderService.suspendService() → POST /suspend
```

---

## The Start Trigger

**Source:** `libs/backend/orchestrator/src/orchestrators/base.orchestrator.ts`

The orchestrator runs inside the API process. It is registered per queue:

- `OrchestratorRanking` — `libs/backend/orchestrator/src/orchestrators/ranking.orchestrator.ts`
- `OrchestratorSync` — `libs/backend/orchestrator/src/orchestrators/sync.orchestrator.ts`

### The 1-minute cron

```ts
@Cron("*/1 * * * *")
async checkQueue() {
  const nodeEnv = this.configService.get<string>("NODE_ENV");
  if (!isProductionEnv(nodeEnv)) {
    // orchestrator is a no-op outside production
    return;
  }
  await this._checkAndStartStopIfNeeded();
}
```

### Decision logic (`_checkAndStartStopIfNeeded`, lines 143-186)

1. Reads `queue.getJobCounts()`.
2. **If `waiting > 0 || active > 0`** and `hasStarted === false`:
   - Calls `this.startServer()`.
   - On success, sets `hasStarted = true` and resets `startTime`.
   - On failure, leaves `hasStarted = false` so the next tick retries.
3. **If the queue is idle** and the worker was previously started:
   - Waits at least `timeoutTime` (default 5 min, configurable via `RENDER_WAIT_TIME`).
   - Then calls `this.stopServer()`.

### The Render API call

`RenderService.startService()` (`libs/backend/orchestrator/src/services/render.service.ts:43-79`):

```ts
await fetch(`${this.renderApi}/services/${service.renderId}/resume`, {
  method: "POST",
  headers: {
    accept: "application/json",
    authorization: `Bearer ${RENDER_API_KEY}`,
  },
});
```

The `renderId` is read from the `Service` DB record (`name: "ranking"` or `name: "sync"`). If `renderId` is null, the orchestrator logs a warning and does nothing — this is a common footgun after renaming/recreating a service on Render.

### Initial state sync on API boot

`OrchestratorBase.onModuleInit()` (lines 32-47) queries the Render API once at startup to learn whether the worker is currently suspended or running, then updates the `Service.status` column and emits a WebSocket event (`SERVICE_STARTED` / `SERVICE_STOPPED`) to connected clients.

---

## The Stop Trigger

Two complementary mechanisms cause workers to wind down:

### 1. Orchestrator suspend (Render-level)

After `RENDER_WAIT_TIME` of queue inactivity, the API orchestrator calls `RenderService.suspendService()` — a POST to `/v1/services/{renderId}/suspend`. Render suspends the process; it no longer counts toward compute cost.

### 2. Idle shutdown (worker-level, sync only)

**Source:** `apps/worker/sync/src/app/services/idle-shutdown.service.ts`

Inside the sync worker, `IdleShutdownService` listens on `queue.on("active")` and `queue.on("waiting")` to reset a timer. If no activity for `WORKER_IDLE_TIMEOUT_MS` (default 30 min), it:

- Confirms the queue is genuinely empty.
- Closes the Puppeteer browser to free RAM (`restartBrowser()`).
- **Keeps the worker process itself running** — the comment in the service explicitly notes "Will remain running; Render may suspend."

So the API orchestrator is the thing that actually suspends the service; the idle shutdown just frees browser resources while waiting.

---

## Scheduled Cron Jobs

Beyond ad-hoc HTTP calls, jobs can be queued on a schedule from rows in the `CronJob` table.

**Source:** `libs/backend/orchestrator/src/crons/cron.ts`

On API boot, `CronService.onModuleInit()`:

1. Clears any existing scheduler entries.
2. Calls `queueSystems()` — loads all ranking `CronJob` rows (`type: "ranking"`, `active: true`). For each `RankingSystem`, it ensures a cron row named `Update Ranking <system>` exists, defaulting to `0 14 * * *` (14:00 Europe/Brussels) with args `{ systemId, calculatePoints: false, recalculatePoints: false }`.
3. Calls `queueCrons()` — loads sync `CronJob` rows (`type: "sync"`, `active: true`) and schedules them.

Each scheduled cron's `onTick` callback:

- Reads the job meta (queue name, job name, arguments).
- Skips if the same job is already `active` or `waiting` in Bull.
- Otherwise calls `queue.add(jobName, arguments, …)`.

The resulting enqueue is then picked up by the orchestrator's 1-minute check and starts the worker exactly as a manual `/api/v1/queue-job` POST would.

### Worker-side cron state reset

`WorkerRankingModule.onApplicationBootstrap()` (`apps/worker/ranking/src/app/app.module.ts:34-60`) and the sync worker equivalent reset `CronJob.amount` to `0` for their queue on boot, so leftover "in-flight" counters from a suspended run are cleared.

---

## Release-Time Deploy Hooks

**Source:** `.github/workflows/main-v2.yml:191-204` and `scripts/render.js`

Separate from the runtime lifecycle, each Render service has a **deploy hook** (a URL that triggers a redeploy). These are used only at release time:

```yaml
- name: Deploy to Prod
  if: github.ref == 'refs/heads/main'
  run: ${{ env.PACKAGE_MANAGER }} run nx -- affected -t deploy --no-agents
  env:
    API_HOOK: ${{ secrets.PROD_API_HOOK }}
    WORKER_SYNC_HOOK: ${{ secrets.PROD_WORKER_SYNC_HOOK }}
    WORKER_RANKING_HOOK: ${{ secrets.PROD_WORKER_RANKING_HOOK }}
```

The nx `deploy` target in each app's `project.json` (for example `apps/worker/ranking/project.json:49-53`) runs:

```
node ./scripts/render.js --app=worker_ranking
```

`scripts/render.js` resolves the env var `<APP>_HOOK` and POSTs to it with no body. Render interprets this as "pull the latest image and redeploy."

**This is not the runtime wake-up mechanism** — the hooks only fire from GitHub Actions after a release merge. The runtime trigger remains the orchestrator's `/resume` call.

---

## Required Configuration

### Environment variables (API)

| Variable | Purpose |
|---|---|
| `NODE_ENV` | Must be `production` for the orchestrator and Render calls to run |
| `RENDER_API_URL` | Base URL, typically `https://api.render.com/v1` |
| `RENDER_API_KEY` | Bearer token for the Render API |
| `RENDER_WAIT_TIME` | Optional. Idle milliseconds before suspending a worker (default 300000 = 5 min) |
| `DEV_ONLY_ALLOW_QUEUE_JOB_WITHOUT_AUTH` | DEV only. `"true"` to bypass JWT on `/queue-job` |
| `DEV_ONLY_QUEUE_JOB_AS_PLAYER_ID` | DEV only. UUID of the player to impersonate when bypass is active |

### Environment variables (sync worker)

| Variable | Purpose |
|---|---|
| `WORKER_IDLE_TIMEOUT_MS` | Milliseconds before the worker closes the browser (default 1800000 = 30 min) |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | Required for websocket adapter and Bull |

### Database state

- `Service` row per worker with `name: "ranking"` or `name: "sync"` and `renderId` set to the Render.com service ID.
- If `renderId` is missing, the orchestrator logs a warning and silently skips — the worker will **not** be started automatically.

### GitHub Actions secrets (release-time)

| Secret | Purpose |
|---|---|
| `PROD_API_HOOK` / `BETA_API_HOOK` | Deploy hook URL for the API |
| `PROD_WORKER_SYNC_HOOK` / `BETA_WORKER_SYNC_HOOK` | Deploy hook for sync worker |
| `PROD_WORKER_RANKING_HOOK` / `BETA_WORKER_RANKING_HOOK` | Deploy hook for ranking worker |

---

## File Reference Map

### API / endpoint
- `apps/api/src/app/controllers/app.controller.ts` — `POST /queue-job` handler

### Queue primitives
- `libs/backend/queue/src/queues.ts` — `SyncQueue` / `RankingQueue` constants
- `libs/backend/queue/src/events/ranking.ts` — `UpdateRankingJob` interface and `Ranking` enum
- `libs/backend/queue/src/events/sync.ts` — sync job types

### Orchestrator (start/stop workers)
- `libs/backend/orchestrator/src/orchestrators/base.orchestrator.ts` — cron + start/stop logic
- `libs/backend/orchestrator/src/orchestrators/ranking.orchestrator.ts` — ranking-queue-bound instance
- `libs/backend/orchestrator/src/orchestrators/sync.orchestrator.ts` — sync-queue-bound instance
- `libs/backend/orchestrator/src/services/render.service.ts` — Render REST client
- `libs/backend/orchestrator/src/crons/cron.ts` — `CronService` (schedule-driven enqueues)

### Worker apps
- `apps/worker/ranking/src/main.ts` — bootstrap
- `apps/worker/ranking/src/app/app.module.ts` — module + boot-time cron reset
- `apps/worker/ranking/src/app/processors/update/update.processor.ts` — `UpdateRanking` job processor
- `apps/worker/sync/src/main.ts` — bootstrap
- `apps/worker/sync/src/app/app.module.ts` — module + boot-time cron reset
- `apps/worker/sync/src/app/services/idle-shutdown.service.ts` — browser cleanup after idle
- `apps/worker/sync/src/app/controllers/admin.controller.ts` — `/admin/jobs/*` queue introspection endpoints

### Release / deploy
- `.github/workflows/main-v2.yml` — release pipeline, calls deploy hooks
- `scripts/render.js` — POSTs to a Render deploy hook URL
- `apps/worker/ranking/project.json` — nx `deploy` target
- `apps/worker/sync/project.json` — nx `deploy` target

### Related docs
- `docs/sync-process.md` — deeper dive into the sync pipeline
- `docs/encounter-games-sync.md` — encounter-game sync specifics
