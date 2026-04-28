# Ranking Sync — Recovery Runbook

Use this when ranking sync has been broken/missing for a while and users report wrong rankings after restart. Companion document to [ranking-sync.md](./ranking-sync.md) — read that first for the system overview and watermark mechanics.

## Why "just re-run the sync from an older date" is not enough

Sync is idempotent and replaying it does refill `RankingPlace` rows from federation truth. But:

1. **The watermark `RankingSystem.calculationLastUpdate` was already advanced to "today"** by every prior sync run, even broken ones — Step 3 (`getPublications`) sets it to the latest federation publication date *regardless* of which publications the run actually processed. See [ranking-sync.md §4.A](./ranking-sync.md#a-watermark--window-mismatch-most-important).
2. The recalc cron `Update Ranking <system>` is gated on `getRankingPeriods(calculationLastUpdate, now) > 0`, which now returns **empty** → places never recomputed for the gap.
3. The cron-launched `UpdateRanking` job uses `calculatePoints: false, recalculatePoints: false` ([cron.ts:163](../libs/backend/orchestrator/src/crons/cron.ts#L163)), so even when it does fire, it skips `RankingPoint` recalc entirely.

Result: federation snapshot is restored, but local-derived state (`RankingLastPlace`, `RankingPoint`, `GamePlayerMembership`) can be stale or orphaned. That's what users are seeing.

---

## Recovery checklist

> Run sequentially. Don't skip Phase 1 — it tells you which later phases you actually need.

### Phase 1 — Diagnose

- [ ] Identify the affected `RankingSystem` id and the gap window `[gap_start, gap_end]`.
- [ ] Check current watermarks per system:
  ```sql
  SELECT id, name, "rankingSystem",
         "calculationLastUpdate", "updateLastUpdate",
         "calculateUpdates", "runCurrently"
  FROM ranking."RankingSystems";
  ```
- [ ] Build a per-date histogram and find holes:
  ```sql
  SELECT "rankingDate"::date, COUNT(*) AS rows
  FROM ranking."RankingPlaces"
  WHERE "systemId" = '<SYSTEM_ID>'
    AND "rankingDate" >= '<gap_start>'
  GROUP BY 1 ORDER BY 1 DESC;
  ```
- [ ] Diff against federation. List all publication dates federation advertises:
  ```
  GET <VR_API>/Ranking/<code>/Publication
  ```
  Diff the result against the previous query. **Holes = Phase 2 needed.**
- [ ] Spot-check 5–10 reportedly-wrong players:
  ```sql
  SELECT p.id, p."firstName", p."lastName", p."memberId",
         lp."rankingDate" AS last_place_date,
         lp.single, lp.double, lp.mix,
         lp."singlePoints", lp."doublePoints", lp."mixPoints"
  FROM "Players" p
  JOIN ranking."RankingLastPlaces" lp ON lp."playerId" = p.id
  WHERE p."memberId" IN ('...', '...', '...')
    AND lp."systemId" = '<SYSTEM_ID>';
  ```
- [ ] Per-player history for those same players:
  ```sql
  SELECT "rankingDate", single, double, mix, "updatePossible"
  FROM ranking."RankingPlaces"
  WHERE "playerId" = '<P>' AND "systemId" = '<SYSTEM_ID>'
  ORDER BY "rankingDate" DESC LIMIT 10;
  ```
- [ ] Check `RankingPoint` coverage for games played during the gap:
  ```sql
  SELECT date_trunc('week', g."playedAt") AS wk,
         COUNT(*) AS games,
         COUNT(rp.id) AS with_points
  FROM event."Games" g
  LEFT JOIN ranking."RankingPoints" rp
    ON rp."gameId" = g.id AND rp."systemId" = '<SYSTEM_ID>'
  WHERE g."playedAt" >= '<gap_start>' AND g."playedAt" < '<gap_end>'
  GROUP BY 1 ORDER BY 1;
  ```
  **`with_points` ≪ `games` = Phase 4 needed.**

**Decision matrix from results:**

| Phase 1 finding | Action |
|---|---|
| Holes in date histogram | Phase 2 |
| No holes, but `RankingLastPlace` lags newest `RankingPlace` | Phase 3 |
| No holes, `RankingLastPlace` correct, but games during gap have no points | Phase 4 |
| Cross-check against federation differs from `RankingLastPlace` for any sampled player | Phase 2 + Phase 3 |

### Phase 2 — Backfill missing `RankingPlace` rows

- [ ] Enqueue a sync job for the **specific gap range only** (do not re-sync from epoch):
  ```ts
  syncQueue.add('SyncRanking', {
    start: '<gap_start>', // ISO 8601
    stop:  '<gap_end>',   // ISO 8601, exclusive
  });
  ```
- [ ] Watch worker logs (`apps/worker/sync`) for `Failed to process publication` lines. Each publication has its own inner transaction — failures don't roll back successes.
- [ ] Re-run the date histogram query from Phase 1. Confirm there are no holes for the gap range.
- [ ] If a single publication keeps failing, fetch it manually via `VisualService` to inspect the federation response.

### Phase 3 — Force places recalc

- [ ] Rewind the watermark on the affected system so the recalc reaches back into the gap:
  ```sql
  UPDATE ranking."RankingSystems"
  SET "calculationLastUpdate" = '<pre_gap_date>',
      "updateLastUpdate"      = '<pre_gap_date>'
  WHERE id = '<SYSTEM_ID>';
  ```
- [ ] Confirm `calculate_updates = true` on the system. If false, the recalc cron is gated off entirely.
- [ ] Enqueue the recalc job directly with both flags **true** (the daily cron uses `false`/`false` and won't fix points):
  ```ts
  rankingQueue.add('UpdateRanking', {
    systemId: '<SYSTEM_ID>',
    calculatePoints: true,
    recalculatePoints: true,
  });
  ```
- [ ] Monitor `RankingQueue` depth: `LLEN bull:ranking:wait` in Redis, or Bull-board.
- [ ] Watch `apps/worker/ranking` logs for per-period progress.

> One job covers all periods between watermark and now. Heavy. Run during off-peak.

### Phase 4 — Force points recalc explicitly

If Phase 1.6 showed orphan points, Phase 3 with `recalculatePoints: true` already covers this — the same `UpdateRanking` job runs `BelgiumFlandersPointsService` (destroy + recreate `RankingPoint` per period). No additional action unless points are still missing after Phase 3 completes.

- [ ] Re-run the per-week game/points query from Phase 1.
- [ ] If still orphan, enqueue `UpdateRanking` again with both flags `true` (idempotent — destroys before recreate).

### Phase 5 — Verify

- [ ] `RankingLastPlace` keeps up with `RankingPlace`:
  ```sql
  SELECT lp."playerId", lp."rankingDate", MAX(rp."rankingDate") AS max_place_date
  FROM ranking."RankingLastPlaces" lp
  JOIN ranking."RankingPlaces" rp
    ON rp."playerId" = lp."playerId" AND rp."systemId" = lp."systemId"
  WHERE lp."systemId" = '<SYSTEM_ID>'
  GROUP BY lp."playerId", lp."rankingDate"
  HAVING lp."rankingDate" < MAX(rp."rankingDate")
  LIMIT 50;
  ```
  Expected: 0 rows. Non-zero rows = `RankingLastPlace` stuck behind. Re-sync the latest publication only — the `@AfterUpsert` hook on `RankingPlace` (`updateLatestRankings`) will fire forward and fix it.
- [ ] Cross-check 5 random reportedly-wrong players against the federation:
  ```
  GET <VR_API>/Ranking/<code>/Publication/<latest_pub_code>/Category/<cat_code>
  ```
  Eyeball their `single`/`double`/`mix` against `RankingLastPlace`.
- [ ] Re-run the points coverage query. `with_points` should equal `games × (typical players-per-game contributions)`.
- [ ] Have one or two of the original reporters confirm their displayed rank now matches expectations.

### Phase 6 — Communicate + monitor

- [ ] Post in the user channel/forum once recalc completes. Phase 3 may take hours on a full dataset.
- [ ] Tail worker logs until queue depth returns to 0.
- [ ] Snapshot `calculationLastUpdate` and confirm it now equals the latest federation publication date.

---

## Don'ts

- Don't clear `RankingPlace` and re-sync from epoch. Federation is your only source of truth and Step 4 (`removeInvisiblePublications`) will *delete* historic rows on next sync if federation hides any of them.
- Don't rewind `calculationLastUpdate` to `2016-08-31` (the model default). `getRankingPeriods` will enumerate years of intervals and saturate the queue + DB.
- Don't run two `Sync.SyncRanking` jobs in parallel. The `cronJob.running` field is dead code (never set to `true`); only Bull's job-name dedup in `CronService` prevents collisions, and that's bypassed when admin enqueues directly.
- Don't disable `calculateUpdates` on the system to "make it stop" — that gates off all recovery jobs too.
- Don't assume the daily cron will heal it on its own. Without watermark rewind it never re-enters the gap.

---

## Prevention — making this not happen again

These changes belong in their own PR. They are not part of the recovery itself.

### Code fixes

1. **Clamp the sync window to the watermark.** In `RankingSyncer.getRankings()` ([ranking-sync.ts:86](../apps/worker/sync/src/app/processors/sync-ranking/ranking-sync.ts#L86)):
   ```ts
   const startDate = args?.start
     ? new Date(args.start)
     : new Date(Math.max(
         subWeeks(new Date(), 1).getTime(),
         system.calculationLastUpdate?.getTime() ?? 0,
       ));
   ```
   So default runs always cover at least everything since the last successful sync, not just one week.

2. **Watermark reflects what was processed, not what was discovered.** Move the `calculationLastUpdate` write out of `getPublications()` (Step 3, [ranking-sync.ts:160](../apps/worker/sync/src/app/processors/sync-ranking/ranking-sync.ts#L160)) and into the end of `processPointsWithSeparateTransactions()`, set to `processedPublications.at(-1).date`. Same for `updateLastUpdate`. Couples the watermark to actual progress so a partial run doesn't lie about itself.

3. **Daily recalc cron should use the right flags.** [cron.ts:163-164](../libs/backend/orchestrator/src/crons/cron.ts#L163) hardcodes `calculatePoints: false, recalculatePoints: false` based on the assumption that sync handles points. After (1) and (2), the recalc still won't compute points if the watermark gets rewound for any reason. Either:
   - flip these to `true` when the gap-vs-watermark exceeds one period, or
   - drop the cron entirely and have sync enqueue its own targeted recalc job per processed publication.

4. **Replace the dead `cronJob.running` guard.** [sync-ranking.processor.ts:51](../apps/worker/sync/src/app/processors/sync-ranking/sync-ranking.processor.ts#L51) reads `cronJob.running` but nothing in the file ever sets it to `true`. Either set/unset it around the run, or remove the field and rely solely on Bull job-locking.

5. **Stop the OUTER tx from spanning the inner publication loop.** [sync-ranking.processor.ts:38](../apps/worker/sync/src/app/processors/sync-ranking/sync-ranking.processor.ts#L38) opens a transaction that stays open across all per-publication inner transactions, meaning the watermark write in Step 3 isn't durable until the entire backfill loop finishes. Either:
   - move the watermark write outside the OUTER tx (committed once per processed publication), or
   - drop the OUTER tx and let each step manage its own transaction.

6. **Make federation visibility changes non-destructive.** `removeInvisiblePublications` ([ranking-sync.ts:184](../apps/worker/sync/src/app/processors/sync-ranking/ranking-sync.ts#L184)) hard-deletes `RankingPlace` rows when federation hides a publication. Mark them inactive instead (or move to an audit table) so we can recover from federation bugs without losing history.

### Operational guardrails

7. **Sync-completion sanity check.** After each sync run, count expected publication dates from federation in `[watermark - 1 month, now]` and compare to `SELECT DISTINCT "rankingDate"` in `RankingPlace` for the same window. Alert when they diverge.

8. **Heartbeat alerting.** Alert if `RankingSystem.calculationLastUpdate` falls more than `2 × calculation_interval` behind `now()`. Catches dead worker, broken cron, federation downtime, all the same way.

9. **Last-successful-sync metric.** Emit a metric per successful run with the count of publications processed. Dashboard the trailing 30 days. A sudden drop to zero or one publication per run is the early warning we missed this time.

10. **Backfill helper script/admin endpoint.** A first-class "backfill from date X" entry point that does Phase 2 + Phase 3 + watermark rewind atomically, so on-call doesn't have to remember the three-step dance.

11. **Document the runbook link in the on-call channel topic.** This file. So nobody re-derives the recovery procedure from logs at 2am.
