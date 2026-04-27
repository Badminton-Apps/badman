# Ranking Sync — Deep Dive

## Context

Full picture of how "Ranking Sync" works in Badman: pulls Belgian Flanders ranking data from Visual Reality (`VR_API`) into local Postgres tables. Doc serves as reference + caveat list. Specifically: behavior when sync stops days/weeks then restarts on stale data.

---

## 1. Global Overview

**Goal**: keep `RankingPlace` / `RankingLastPlace` / `Player` tables in sync with publications served by Visual Reality. Each publication = snapshot of player ranks/points at a date for a category (HE/SM, DD, GD, etc.). Some publications also "promote" players (`updatePossible`).

**Topology**:
- **Producer** = `CronService` in API process ([cron.ts](../libs/backend/orchestrator/src/crons/cron.ts)) — scheduled via DB-backed `CronJob` rows + `cron` lib, Europe/Brussels TZ. Pushes `Sync.SyncRanking` job onto `SyncQueue` (Redis/Bull).
- **Consumer** = `SyncRankingProcessor` in worker-sync app ([sync-ranking.processor.ts](../apps/worker/sync/src/app/processors/sync-ranking/sync-ranking.processor.ts)) — single Bull processor.
- **Orchestrator** = `RankingSyncer` ([ranking-sync.ts](../apps/worker/sync/src/app/processors/sync-ranking/ranking-sync.ts)) — pipeline of `ProcessStep`s + per-publication transactions.
- **HTTP client** = `VisualService` ([visual.service.ts](../libs/backend/visual/src/services/visual.service.ts)) — axios + retry, XML → JSON via fast-xml-parser.
- **Recalc cron** = parallel cron `Update Ranking <system>` enqueues `RankingQueue` job for `BelgiumFlandersPlacesService` to (re)compute *places* (level changes) when `calculationLastUpdate` advanced.

---

## 2. Flow Chart

```
                       Europe/Brussels 14:00
                              │
                              ▼
              ┌──────────────────────────────┐
              │  CronService._queueSyncJob   │  cron.ts:92
              │  (skip if active job exists) │
              └─────────────┬────────────────┘
                            ▼
                   SyncQueue (Bull/Redis)
                            │
                            ▼
              ┌──────────────────────────────┐
              │  SyncRankingProcessor        │  processor:30
              │  - open OUTER tx             │
              │  - cronJob.amount++          │
              │  - startLockRenewal(job)     │
              └─────────────┬────────────────┘
                            ▼
              ┌──────────────────────────────┐
              │  RankingSyncer.process()     │  ranking-sync:60
              └─────────────┬────────────────┘
                            ▼
   ┌────────────────── OUTER TX ─────────────────────┐
   │  Step 1: getRankings()                          │
   │   GET /Ranking → pick name=VISUAL system        │
   │   start = job.start || now-1w                   │
   │   stop  = job.stop  || undef                    │
   │                                                 │
   │  Step 2: getCategories()                        │
   │   GET /Ranking/{id}/Category                    │
   │                                                 │
   │  Step 3: getPublications()                      │
   │   GET /Ranking/{id}/Publication                 │
   │   sort visible asc, classify usedForUpdate      │
   │   SET system.calculationLastUpdate = LAST.date  │  ← watermark
   │   SET system.updateLastUpdate     = LAST_UPD    │
   │   system.save()                                 │
   │                                                 │
   │  Step 4: removeInvisiblePublications()          │
   │   for each hidden pub date                      │
   │     DESTROY RankingPlace WHERE date+systemId    │
   └─────────────────────────────────────────────────┘
                            ▼
   ┌─ processPointsWithSeparateTransactions() ──────┐
   │  filter pubs: start < date < stop              │
   │  FOR EACH publication:                         │
   │    open INNER tx                               │
   │      FOR EACH category (6 cats):               │
   │        GET /Pub/{p}/Cat/{c} (no cache)         │
   │        Player.findAll by memberId              │
   │        new players → push to map               │
   │        build RankingPlace per player           │
   │      Player.bulkCreate(ignoreDuplicates)       │
   │      RankingPlace.bulkCreate(                  │
   │          updateOnDuplicate=[points,rank,...]   │
   │          chunk=500, sleep 1s/chunk)            │
   │    INNER commit                                │
   │    sleep 2s                                    │
   │  END                                           │
   └────────────────────────────────────────────────┘
                            ▼
              ┌─────────── OUTER COMMIT ───────────┐
              │  cronJob.amount--                  │
              │  cronJob.lastRun = now             │
              └────────────────────────────────────┘

           ── parallel cron, same 14:00 daily ──
           Update Ranking <system>  (cron.ts:138)
           guard: getRankingPeriods(system,
                  calculationLastUpdate, now) > 0
              → RankingQueue.add(UpdateRankingJob,
                  {calculatePoints:false, ...})
              → BelgiumFlandersPlacesService
                computes upgrades/downgrades on
                publications where updatePossible
```

---

## 3. Components

### Apps
| File | Role |
|---|---|
| [apps/worker/sync/src/main.ts](../apps/worker/sync/src/main.ts) | Bootstrap NestJS Fastify worker. |
| [apps/worker/sync/src/app/app.module.ts](../apps/worker/sync/src/app/app.module.ts) | Wires `SyncRankingProcessor`, `VisualModule`, `RankingModule`, Bull queues. On bootstrap resets `CronJob.amount=0` for stale jobs. |
| [apps/worker/sync/src/app/processors/global.ts](../apps/worker/sync/src/app/processors/global.ts) | Logs Bull stalled/failed events on `SyncQueue`. |
| [apps/worker/ranking/](../apps/worker/ranking) | Sister worker on `RankingQueue` — recalc places/points (post-sync). |

### Sync orchestrator
| File | Role |
|---|---|
| [sync-ranking.processor.ts](../apps/worker/sync/src/app/processors/sync-ranking/sync-ranking.processor.ts) | `@Processor(SyncQueue)` → `@Process(Sync.SyncRanking)`. Opens OUTER tx, calls `RankingSyncer.process()`, manages `CronJob.running/amount/lastRun`. |
| [ranking-sync.ts](../apps/worker/sync/src/app/processors/sync-ranking/ranking-sync.ts) | `RankingSyncer` class. Pipeline of `ProcessStep`s + per-publication inner-tx loop. |
| [ranking-utils.ts](../apps/worker/sync/src/app/processors/sync-ranking/ranking-utils.ts) | `isPublicationUsedForUpdate()` — month bitmask (`updateMonths=[0,2,4,6,8,10]`) + hardcoded "fucked dates" list (2021 federation glitch). |
| [utils/correctWrongPlayers.ts](../apps/worker/sync/src/app/utils) | Hardcoded memberId → memberId fixes for federation typos. |
| [utils/lock-renewal.ts](../apps/worker/sync/src/app/utils) | `startLockRenewal(job)` — Bull lock renewal heartbeat for long-running job. |

### Visual Reality client
| File | Role |
|---|---|
| [visual.service.ts](../libs/backend/visual/src/services/visual.service.ts) | axios client to `VR_API`. Endpoints: `/Ranking`, `/Ranking/{id}/Category`, `/Ranking/{id}/Publication`, `/Ranking/{id}/Publication/{p}/Category/{c}`. XML → JSON. Optional in-memory cache (sync passes `false` to bypass for fresh data on points). |

### Cron + queues
| File | Role |
|---|---|
| [libs/backend/orchestrator/src/crons/cron.ts](../libs/backend/orchestrator/src/crons/cron.ts) | `CronService.onModuleInit` — loads `CronJob` rows, schedules each via `cron` lib. Sync jobs: cronTime per row. Ranking jobs: hardcoded `0 14 * * *` daily. Dedup: skip if Bull queue has active/waiting same `jobName`. |
| [libs/backend/queue/src/queues.ts](../libs/backend/queue/src/queues.ts) | `SyncQueue="sync"`, `RankingQueue="ranking"`. |
| [libs/backend/queue/src/events/sync.ts](../libs/backend/queue/src/events/sync.ts) | `Sync.SyncRanking`, `Sync.CheckRanking` enums. |
| [libs/backend/queue/src/events/ranking.ts](../libs/backend/queue/src/events/ranking.ts) | `UpdateRankingJob` shape. |
| [libs/backend/queue/src/sync-job-options.ts](../libs/backend/queue/src/sync-job-options.ts) | Default Bull options: `attempts:3`, `backoff exp 60s`, `removeOnComplete:true`, `removeOnFail:false`. |

### Models (`@badman/backend-database`, schema=`ranking`)
| File | Role |
|---|---|
| [ranking-system.model.ts](../libs/backend/database/src/models/ranking/ranking-system.model.ts) | Per-system config + watermarks: `calculationLastUpdate`, `updateLastUpdate` (default 2016-08-31), `calculationInterval{Amount,Unit}`, `updateInterval{Amount,Unit}`, `period{Amount,Unit}`, `inactivity*`, `calculateUpdates`, `runCurrently`, point-cap formulas. |
| [ranking-place.model.ts](../libs/backend/database/src/models/ranking/ranking-place.model.ts) | Composite UNIQUE on `(rankingDate, playerId, systemId)` (`unique_constraint`) + same triple BTREE index `ranking_index`. Hooks `@AfterCreate/Update/Upsert/BulkCreate/BulkUpdate` → `updateLatestRankings()` upserts `RankingLastPlace` (only forward in time) + `updateGameRanking()` walks all games between this `rankingDate` and next, `findOrCreate`s `GamePlayerMembership`. |
| [ranking-last-place.model.ts](../libs/backend/database/src/models/ranking/ranking-last-place.model.ts) | Single most-recent place per (player,system). Used by GraphQL queries to avoid joining on `RankingPlace` history. |
| [ranking-point.model.ts](../libs/backend/database/src/models/ranking/ranking-point.model.ts) | Per-game contribution. Index on `(playerId, systemId)`. Owned by recalc pipeline, not by sync. |
| [cron-job.model.ts](../libs/backend/database/src/models/system/cron-job.model.ts) | `name`, `cronTime`, `running`, `amount`, `lastRun`, `meta:{queueName,jobName,arguments}`, `type:'sync'\|'ranking'`. Acts as DB-backed scheduler config + simple in-flight counter. |

### Recalc pipeline (post-sync)
| File | Role |
|---|---|
| [libs/backend/ranking/src/services/calculation/calculation.service.ts](../libs/backend/ranking/src/services/calculation/calculation.service.ts) | Driver: `getRankingPeriods(system, fromDateM, toDateM)` enumerates publication periods to recalc. |
| [libs/backend/belgium/flanders/points/src/services/belgium-flanders-points.service.ts](../libs/backend/belgium/flanders/points/src/services/belgium-flanders-points.service.ts) | Computes `RankingPoint` from games — destroy+recreate per period. |
| [libs/backend/belgium/flanders/places/src/services/belgium-flanders-places.service.ts](../libs/backend/belgium/flanders/places/src/services/belgium-flanders-places.service.ts) | Computes player level changes per `updatePossible` publication. |
| [libs/utils/src/lib/ranking/getRankingPeriods.ts](../libs/utils/src/lib/ranking) | Pure helper — iterates intervals from anchor to now. |

---

## 4. Caveats & Pitfalls

### A. Watermark / window mismatch (most important)
- `getPublications()` writes `system.calculationLastUpdate = pubs.at(-1).date` **= LATEST visible publication globally**, NOT the last one *processed in this run* ([ranking-sync.ts:160](../apps/worker/sync/src/app/processors/sync-ranking/ranking-sync.ts#L160)).
- `processPointsWithSeparateTransactions()` only iterates publications between `startDate` (default `now-1w`) and `stopDate`.
- Watermark advances even when many older publications were skipped because they fell outside the default 1-week window.
- Watermark commits with the **OUTER** tx, after inner txns commit. So normally consistent within a run.

### B. Default sync window = 1 week (`subWeeks(now, 1)`)
- No catch-up logic. If worker down 4 weeks then restarted, default scheduled run only re-fetches last 7 days. Older missed publications go unprocessed. Operator must manually enqueue `Sync.SyncRanking` with explicit `start`/`stop` to backfill.
- Cron `arguments` for sync are static in the `CronJob.meta` row — no logic that derives `start` from `system.calculationLastUpdate`.

### C. OUTER tx held open across all inner publication loops
- OUTER tx wraps steps 1–4 and stays open while inner per-publication txns run sequentially with `sleep(2s)` + `sleep(1s)` per 500-row chunk + HTTP calls.
- For a backfill of N publications: outer tx open for N × (~5–30s). Postgres fine, but blocks autovacuum on touched tables, accumulates locks/snapshot for `removeInvisiblePublications` writes.
- If outer commits but worker dies during inner loop: inner-committed pubs persist + watermark NOT saved (outer never reached commit) → safe re-sync (idempotent upserts).
- If outer commits *after* inner loop completes (normal path): watermark saved. Crash here is fine.
- If inner throws: caught at top of processor, outer rolls back, watermark not saved, but **inner-committed pubs remain in DB** — partial state. Idempotent on next run.

### D. Inner-vs-outer split = "half-committed" risk
- Step 4 `removeInvisiblePublications` runs in OUTER tx. It DESTROYS `RankingPlace` rows for any date the federation flagged hidden.
- If inner loop later fails, OUTER rolls back — destroy is reverted, OK.
- **But**: inner txn upserts that ran before failure stay committed. Re-run will re-process them, AND will re-run destroys. If a date oscillates visible↔hidden, places churn (and `RankingLastPlace` hooks fire each time).

### E. `updateGameRanking` hook fan-out
- Every `RankingPlace` upsert (`@AfterUpsert`/`@AfterBulkCreate`) walks ALL games for that player between this `rankingDate` and the next, then `findOrCreate`s `GamePlayerMembership` rows ([ranking-place.model.ts:371](../libs/backend/database/src/models/ranking/ranking-place.model.ts#L371)).
- Backfilling a year of publications = N players × M publications × games-between iterations of model loads. Cost is O(players × publications × games). Will saturate DB.
- Errors swallowed (`console.error(e)`) — silent partial state.

### F. `RankingLastPlace` only moves forward
- `updateLatestRankings()` ([ranking-place.model.ts:301](../libs/backend/database/src/models/ranking/ranking-place.model.ts#L301)) only updates `RankingLastPlace` if new `rankingDate >= existing`. Good — out-of-order processing won't regress current state.
- Side effect: if backfill processes older dates AFTER newer ones already exist, `RankingLastPlace` stays correct, but the backfilled `RankingPlace` rows still trigger the hook → `findAll` query fires unnecessarily.

### G. Single-instance assumption + `runCurrently` unused
- `RankingSystem.runCurrently` field exists but is not read anywhere in the sync path. Concurrency guard relies on:
  - `cronJob.running` early-return ([processor:51](../apps/worker/sync/src/app/processors/sync-ranking/sync-ranking.processor.ts#L51)) — but `running` is **never set to true** in this file (only `amount++/--`). So this guard is dead code.
  - `CronService` Bull dedup: `queue.getJobs(['active','waiting'])` on push.
- If the same job lands on two worker pods, Bull's job lock + `attempts:3` are the only line of defense. Lock renewal helps. But two concurrent sync runs CAN both write — no DB-level lock on `RankingSystem`. Idempotent upsert mitigates, but `removeInvisiblePublications` + hooks can race.

### H. Visibility flag = federation has full delete authority
- A publication going from visible → hidden upstream causes us to `RankingPlace.destroy` for that date on next sync. If federation hides historic data (intentional or accidental), our DB drops it too.

### I. Hardcoded "fucked dates"
- `fuckedDatesGoods=["2021-09-12T22:00:00.000Z"]` / `fuckedDatesBads=["2021-09-05T22:00:00.000Z"]` ([ranking-sync.ts:35-36](../apps/worker/sync/src/app/processors/sync-ranking/ranking-sync.ts#L35)). Manual federation-error patch baked into code. New federation glitches require code change.

### J. No HTTP "since" parameter
- VisualService always fetches the **full publication list** then filters client-side. Network cost not bounded by `start`/`stop`.
- Per-category points endpoint also returns full list per (publication, category). For 6 categories × N publications = 6N calls minimum.

### K. Memory / Bull lock pressure
- Mitigations present: chunk=500, `global.gc()` per publication, `await sleep(2s)` per pub, `sleep(1s)` per chunk, `startLockRenewal` heartbeat.
- Backfill of years still risks: outer-tx-too-old, lock renewal lag if `setTimeout` event loop blocked, OOM if a single publication has very large player set.

### L. `attempts: 3, exponential 60s` on sync-job-options vs `30s` on cron-queued
- Cron path uses 30s base ([cron.ts:119](../libs/backend/orchestrator/src/crons/cron.ts#L119)). Direct/manual job path uses 60s base. Inconsistent behavior under retry.

### M. Recalc cron predicate
- `Update Ranking <system>` cron fires only if `getRankingPeriods(calculationLastUpdate, now).length > 0`.
- Predicate uses `calculationLastUpdate`. After successful sync run, watermark = latest publication. Next day, recalc fires only if a new period boundary crossed. Healthy under normal cadence.
- After backfill that catches the watermark up to "today": recalc may need to process dozens of periods at once — `BelgiumFlandersPlacesService` queues per-player jobs → can flood `RankingQueue`.

---

## 5. Scenario: Sync stops, restarts on stale data

### Day 0–1 (first 24h gap)
- Cron skipped or worker down. `system.calculationLastUpdate` = last good run. No federation publications missed (federation publishes weekly).
- Restart: regular cron at 14:00 fires. `start = now-1w` covers gap. All publications fetched, processed in own inner txns. Watermark advances. **Self-heals.**

### Day 2–7 (1 week)
- Same as above — default 1-week window covers it. Self-heals.

### Day 8–13 (>1 week, <2 weeks)
- Default `subWeeks(now,1)` no longer covers all missed publications. Probably 1 publication missed (federation publishes ~bi-weekly).
- Restart: only most-recent publication processed. **`calculationLastUpdate` jumps to LATEST publication anyway** (Step 3 sets it to `pubs.at(-1).date` regardless of which were processed) → recalc cron sees no work for the skipped period.
- **Result**: data hole. `RankingPlace` rows missing for the skipped publication date. Players who upgraded via that pub may have stale `RankingLastPlace` if no later publication updated them. Operator must manually enqueue `Sync.SyncRanking` with `{start: <gap-start>, stop: <gap-end>}`.

### Weeks (multi-publication gap)
- Several publications missed, including some `usedForUpdate=true` (every 2 months: months 0,2,4,6,8,10). Skipping a `usedForUpdate` publication = skipping a level-change event for the whole player base.
- On restart with default window: only last publication imported. Missed `usedForUpdate` publications never trigger their `BelgiumFlandersPlacesService` recalc (because their dates are skipped + watermark already moved past).
- **Concrete consequences**:
  1. Player levels frozen at pre-gap state for any system using these dates.
  2. New games played during gap: `GamePlayerMembership` rows reference latest known `RankingPlace` (forward-walking hook), not the federation's actual mid-gap rankings.
  3. Recalc cron sees no work → never recomputes places for skipped intervals.
  4. `RankingPoint` recreate logic (destroy-and-recreate per period in `BelgiumFlandersPointsService`) still fires for periods after watermark — fine — but periods inside the gap are quietly orphaned.

### Recovery procedure
- Manual job: `SyncQueue.add(Sync.SyncRanking, { start: <pre-gap-date>, stop: <today> })`.
  - This bypasses default window. Inner loop processes every visible publication in range.
  - Watermark already at "latest" — that's OK; sync still upserts.
  - Hooks fire heavily: `updateGameRanking` walks games for each player×publication. **Expect long runtime + DB load**.
- After backfill, manually re-enqueue `Ranking.UpdateRanking` per affected `RankingSystem` to recompute places, OR temporarily `system.calculationLastUpdate = <pre-gap-date>` so the recalc cron picks up the periods automatically. **The latter is safer** — ensures `getRankingPeriods()` returns the missing intervals.
- If `calculateUpdates=false` on the system (default for inactive ones), recalc cron is gated off — won't auto-recover even with watermark rewind.

### Key insight
> Sync code treats "default window" as a soft constraint, but treats "watermark" as a hard global pointer to "latest publication seen by federation API". These two diverge during gaps. The ONLY mechanism that closes a divergence is an operator passing explicit `start`/`stop`. Nothing in the code computes a backfill window from the watermark.

### Mitigation ideas (for follow-up)
1. In `getRankings()`, default `start = max(subWeeks(now,1), system.calculationLastUpdate)` — clamps watermark to current run before processing.
2. Move `calculationLastUpdate` write from Step 3 (publications discovery) to *after* successful inner loop, set to `processedPublications.at(-1).date`, so watermark reflects what was actually processed.
3. Add a post-sync sanity check: count expected publications between watermark and now from federation, count `RankingPlace` distinct dates in same window, alert on mismatch.
4. Replace the `cronJob.running` dead guard with a real one (`runCurrently` lock or `cronJob.amount > 0`).

---

## 6. Critical files (already touched in this analysis)

- [apps/worker/sync/src/app/processors/sync-ranking/sync-ranking.processor.ts](../apps/worker/sync/src/app/processors/sync-ranking/sync-ranking.processor.ts) — outer tx, cronJob bookkeeping
- [apps/worker/sync/src/app/processors/sync-ranking/ranking-sync.ts](../apps/worker/sync/src/app/processors/sync-ranking/ranking-sync.ts) — pipeline + per-publication inner tx
- [apps/worker/sync/src/app/processors/sync-ranking/ranking-utils.ts](../apps/worker/sync/src/app/processors/sync-ranking/ranking-utils.ts) — `isPublicationUsedForUpdate`
- [libs/backend/visual/src/services/visual.service.ts](../libs/backend/visual/src/services/visual.service.ts) — Visual API client
- [libs/backend/database/src/models/ranking/ranking-system.model.ts](../libs/backend/database/src/models/ranking/ranking-system.model.ts) — watermarks
- [libs/backend/database/src/models/ranking/ranking-place.model.ts](../libs/backend/database/src/models/ranking/ranking-place.model.ts) — unique constraint + side-effect hooks
- [libs/backend/orchestrator/src/crons/cron.ts](../libs/backend/orchestrator/src/crons/cron.ts) — schedule + dedup + recalc gating
- [libs/backend/queue/src/sync-job-options.ts](../libs/backend/queue/src/sync-job-options.ts) — Bull retry config

## 7. Verification (how to validate this analysis live)

- `psql ... -c "SELECT name, calculation_last_update, update_last_update, calculate_updates FROM ranking.ranking_systems;"` to inspect current watermarks.
- Bull-board (or Redis CLI: `LRANGE bull:sync:wait 0 -1`) to inspect pending/active sync jobs.
- `SELECT ranking_date, COUNT(*) FROM ranking.ranking_places WHERE system_id='<id>' GROUP BY 1 ORDER BY 1 DESC LIMIT 30;` — find date holes.
- Compare with Visual API: `GET <VR_API>/Ranking/<code>/Publication` → list of dates federation thinks should exist. Diff against query above = the actual gap.
- Manual replay: `redis-cli LPUSH bull:sync:wait '<job-payload>'` or via API admin endpoint, with `start`/`stop` covering the gap.
