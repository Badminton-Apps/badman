# Manually starting a ranking-sync

Source: [`docs/ranking-sync-recovery.md`](./ranking-sync-recovery.md) (runbook) and [`docs/ranking-sync.md`](./ranking-sync.md) (system overview).

## When you need to do this

The daily cron only re-fetches publications from the last week (`subWeeks(now, 1)`). The watermark `RankingSystem.calculationLastUpdate` advances to the latest visible federation publication on *every* run — even runs that processed nothing. So once a gap is older than 1 week, the cron will never re-enter it on its own. You have to enqueue the work by hand.

Two jobs cover the two halves of recovery:

1. **`Sync.SyncRanking`** — backfills missing `RankingPlace` rows from the federation for an explicit date range.
2. **`Ranking.UpdateRanking`** — recomputes places and (optionally) points for the affected `RankingSystem`. The daily recalc cron hardcodes `calculatePoints: false, recalculatePoints: false`, so for recovery you must enqueue this one yourself with both flags `true`.

---

## Prerequisites

- API running: `nx serve api` (port 5010).
- Sync worker running: `nx serve worker-sync`.
- Ranking worker running: `nx serve worker-ranking` (only needed before Phase 3).
- Docker up: `npm run docker:up` (Postgres + Redis).
- Auth: JWT for a user with `change:job` permission. In development you can use the dev bypass — set in `.env`:
  ```
  DEV_ONLY_ALLOW_QUEUE_JOB_WITHOUT_AUTH=true
  DEV_ONLY_QUEUE_JOB_AS_PLAYER_ID=<player-id with change:job>
  ```
  Bypass only works when `NODE_ENV=development` ([app.controller.ts:48-76](../apps/api/src/app/controllers/app.controller.ts#L48-L76)).

All Postman requests target:

```
POST http://localhost:5010/queue-job
Content-Type: application/json
Authorization: Bearer <JWT>   ← omit if using dev bypass
```

---

## Phase 1 — Verify current ranking state

Find `SYSTEM_ID` first:

```sql
SELECT id, name, "calculateUpdates", "calculationLastUpdate", "updateLastUpdate"
FROM ranking."RankingSystems"
WHERE "runCurrently" = true;
```

### 1.1 Distinct ranking dates in last 30 days (gap detection)

```sql
SELECT DISTINCT "rankingDate"
FROM ranking."RankingPlaces"
WHERE "systemId" = '<SYSTEM_ID>'
  AND "rankingDate" >= NOW() - INTERVAL '30 days'
  AND "rankingDate" <= NOW()
ORDER BY "rankingDate";
```

Federation publishes ~biweekly. Expect a row roughly every 2 weeks. A missing slot = gap.

### 1.2 Check for stray future-dated rows

```sql
SELECT "rankingDate", COUNT(*) AS row_count
FROM ranking."RankingPlaces"
WHERE "systemId" = '<SYSTEM_ID>'
  AND "rankingDate" > NOW()
GROUP BY "rankingDate";
```

Real federation pub = thousands of rows. A single row = stray from a bad manual sync (wrong `start`/`stop` input). Clean up before backfilling, otherwise the watermark stays anchored to that bogus date.

> **Warning:** Destructive. Run inside a transaction so you can inspect counts and rollback if something looks off.

```sql
BEGIN;
DELETE FROM ranking."RankingPoints"
  WHERE "systemId" = '<SYSTEM_ID>' AND "rankingDate" = '<bogus_date>';
DELETE FROM ranking."RankingPlaces"
  WHERE "systemId" = '<SYSTEM_ID>' AND "rankingDate" = '<bogus_date>';
DELETE FROM ranking."RankingLastPlaces"
  WHERE "systemId" = '<SYSTEM_ID>' AND "rankingDate" = '<bogus_date>';
-- Inspect rowcounts, then:
COMMIT;  -- or ROLLBACK
```

### 1.3 `RankingLastPlace` vs `RankingPlace` (recalc lag)

```sql
SELECT lp."playerId", lp."rankingDate", MAX(rp."rankingDate") AS max_place_date
FROM ranking."RankingLastPlaces" lp
JOIN ranking."RankingPlaces" rp
  ON rp."playerId" = lp."playerId" AND rp."systemId" = lp."systemId"
WHERE lp."systemId" = '<SYSTEM_ID>'
GROUP BY lp."playerId", lp."rankingDate"
HAVING lp."rankingDate" < MAX(rp."rankingDate")
LIMIT 20;
```

Zero rows = `RankingLastPlace` caught up. Non-zero = recalc lag, Phase 3 needed.

### 1.4 Pick the scenario

| Gap between last good `rankingDate` and now | Scenario | Action |
|---|---|---|
| 0–7 days | Day 0–7 | Default cron heals on next 14:00 run. Skip manual steps, OR run Phase 2 with empty `jobArgs` to force it. |
| 8–13 days (likely 1 pub missed) | Day 8–13 | Phase 2 with explicit `start`/`stop` + Phase 3 (watermark rewind + recalc). |
| > 2 weeks (multiple pubs, possibly `usedForUpdate`) | Weeks | Same as Day 8–13, but heavier. Off-peak only. |

---

## Phase 2 — Backfill missing `RankingPlace` (`Sync.SyncRanking`)

The filter inside the sync is `start < pubDate < stop` ([ranking-sync.md:69](./ranking-sync.md#L69)). Make `start` strictly before the first missing pub and `stop` strictly after the last one.

### Day 0–7 — default window (now-1w → now)

```json
{
  "queue": "sync",
  "job": "SyncRanking",
  "jobArgs": {},
  "removeOnComplete": true,
  "removeOnFail": 50
}
```

Empty `jobArgs` triggers default `start = subWeeks(now, 1)`, `stop = now`.

### Day 8–13 / Weeks — explicit gap window

```json
{
  "queue": "sync",
  "job": "SyncRanking",
  "jobArgs": {
    "start": "<last_good_pub_minus_1s ISO>",
    "stop":  "<now ISO>"
  },
  "removeOnComplete": true,
  "removeOnFail": 50
}
```

Example: last good pub on `2026-04-26T22:00:00Z`, today is `2026-05-11`:

```json
{
  "queue": "sync",
  "job": "SyncRanking",
  "jobArgs": {
    "start": "2026-04-26T21:59:59.000Z",
    "stop":  "2026-05-11T23:59:59.000Z"
  },
  "removeOnComplete": true,
  "removeOnFail": 50
}
```

### Monitor

- Worker logs: `apps/worker/sync`. Watch for `Failed to process publication` — each pub has its own inner transaction, single failures don't roll back others.
- Queue depth:
  ```bash
  redis-cli LLEN bull:sync:wait
  redis-cli LLEN bull:sync:active
  ```

### Verify backfill (re-run Phase 1.1)

The missing `rankingDate` rows should now be present. If a single pub keeps failing, fetch it manually via `VisualService` to inspect the federation response.

---

## Phase 3 — Recompute places and points (`Ranking.UpdateRanking`)

Only needed when:

- Gap was > 1 week (watermark already advanced past the gap), **or**
- Phase 1.3 showed `RankingLastPlace` lag.

After the Phase 2 sync finishes, the watermark sits at the most recent processed pub. That's correct as a *mirror of state* but means `getRankingPeriods` returns no boundaries inside the gap, so the recalc would skip it. Rewind first.

### 3.1 Rewind watermark to pre-gap

> **Warning:** UPDATE on `RankingSystems` watermark. Affects what `getRankingPeriods` enumerates. Note pre-change values for rollback. Do **not** rewind to the model default `2016-08-31` — would enumerate years of intervals and saturate the queue and DB.

```sql
UPDATE ranking."RankingSystems"
SET "calculationLastUpdate" = '<last_good_pre_gap_date>',
    "updateLastUpdate"      = '<last_good_pre_gap_date>'
WHERE id = '<SYSTEM_ID>';
```

Confirm `calculateUpdates = true` (Phase 1 query). If `false`, the recalc cron and recovery jobs are gated off.

### 3.2 Wait for Phase 2 to finish before rewinding

Phase 2's Step 3 (`getPublications`) overwrites `calculationLastUpdate` to the latest visible federation pub ([ranking-sync.ts:168](../apps/worker/sync/src/app/processors/sync-ranking/ranking-sync.ts#L168)). If you rewind while a sync is mid-flight, the sync will undo your rewind.

### 3.3 Enqueue `Ranking.UpdateRanking`

Both flags must be `true` — the daily cron uses `false/false` and will not fix points.

```json
{
  "queue": "ranking",
  "job": "UpdateRanking",
  "jobArgs": {
    "systemId": "<SYSTEM_ID>",
    "calculatePoints": true,
    "recalculatePoints": true
  },
  "removeOnComplete": true,
  "removeOnFail": 50
}
```

### 3.4 What "recalculating from a year ago" looks like — and why it is normal

With `recalculatePoints: true`, the points window extends back by `system.periodAmount`/`periodUnit` (typically 1 year for the Belgian system) ([calculation.service.ts:77-80](../libs/backend/ranking/src/services/calculation/calculation.service.ts#L77-L80)):

```typescript
const minUpdatePoints = moment(updates[0].date).subtract(
  system.periodAmount,
  system.periodUnit
);
```

`RankingPoint` rows in `[minUpdatePoints, maxUpdate]` are destroyed and recreated. The Belgian ranking uses a rolling 1-year window of game points, so recalc'ing places at date X needs points back to X − 1 year. Expect long runtime; run during off-peak.

If you don't need points rewind (places only) use `recalculatePoints: false`. For gap recovery `true` is correct — ensures any games played during the gap get scored properly.

### Monitor

- Worker logs: `apps/worker/ranking`, per-period progress lines.
- Queue depth:
  ```bash
  redis-cli LLEN bull:ranking:wait
  redis-cli LLEN bull:ranking:active
  ```

---

## Phase 4 — Verify recovery

### 4.1 Watermark advanced

```sql
SELECT "calculationLastUpdate", "updateLastUpdate"
FROM ranking."RankingSystems"
WHERE id = '<SYSTEM_ID>';
```

Should equal the latest `rankingDate` you have in `RankingPlaces` (Phase 1.1).

### 4.2 `RankingLastPlace` caught up (re-run Phase 1.3)

Zero rows expected.

### 4.3 No date holes in gap (re-run Phase 1.1)

Every expected pub date in the gap is now present.

### 4.4 Points coverage for games in the gap

```sql
SELECT date_trunc('week', g."playedAt") AS wk,
       COUNT(*)                        AS games,
       COUNT(rp.id)                    AS with_points
FROM "Games" g
LEFT JOIN ranking."RankingPoints" rp
  ON rp."gameId" = g.id AND rp."systemId" = '<SYSTEM_ID>'
WHERE g."playedAt" >= '<gap_start>' AND g."playedAt" < '<gap_end>'
GROUP BY wk
ORDER BY wk;
```

`with_points` should equal `games × (typical players-per-game contributions)`. If still orphan after Phase 3, re-enqueue `UpdateRanking` with both flags `true` again (destroys before recreate, idempotent).

---

## Heads-up before you run anything

- **Don't** clear `RankingPlace` and re-sync from epoch. Federation is the source of truth and `removeInvisiblePublications` will hard-delete historic rows on the next sync if federation hides them.
- **Don't** rewind `calculationLastUpdate` all the way back to `2016-08-31` (the model default) — `getRankingPeriods` will enumerate years of intervals and saturate the queue and DB.
- **Don't** run two `Sync.SyncRanking` jobs in parallel. The `cronJob.running` guard is dead code; only Bull's job-name dedup in `CronService` prevents collisions, and that's bypassed when you enqueue directly.
- **Don't** disable `calculateUpdates` on the system to "make it stop" — that gates off all recovery jobs too.
- **Don't** assume the daily cron will heal it on its own. Without a watermark rewind it never re-enters the gap.

## Full runbook

For deeper diagnosis queries, the cross-check against federation, and additional verification, see [`ranking-sync-recovery.md`](./ranking-sync-recovery.md). For the system overview and the watermark/window mismatch in depth, see [`ranking-sync.md`](./ranking-sync.md) §4.A and §4.B.
