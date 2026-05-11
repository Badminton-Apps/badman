# Manually starting a ranking-sync

Source: [`docs/ranking-sync-recovery.md`](./ranking-sync-recovery.md) (runbook) and [`docs/ranking-sync.md`](./ranking-sync.md) (system overview).

## When you need to do this

The daily cron only re-fetches publications from the last week (`subWeeks(now, 1)`). And the watermark `RankingSystem.calculationLastUpdate` advances to the latest visible federation publication on *every* run — even runs that processed nothing. So once a gap is older than 1 week, the cron will never re-enter it on its own. You have to enqueue the work by hand.

Two jobs cover the two halves of recovery:

1. **`Sync.SyncRanking`** — backfills missing `RankingPlace` rows from the federation for an explicit date range.
2. **`Ranking.UpdateRanking`** — recomputes places and (optionally) points for the affected `RankingSystem`. The daily recalc cron hardcodes `calculatePoints: false, recalculatePoints: false`, so for recovery you must enqueue this one yourself with both flags `true`.

Read the runbook before doing this on a real gap — Phase 1 of the runbook tells you which of the two below you actually need.

---

## Phase 2 — Manually enqueue `Sync.SyncRanking` to backfill `RankingPlace`

Enqueue the sync job for the **specific gap range only** — do not re-sync from epoch. Use ISO 8601 dates; `stop` is exclusive.

```ts
syncQueue.add('SyncRanking', {
  start: '<gap_start>', // ISO 8601
  stop:  '<gap_end>',   // ISO 8601, exclusive
});
```

Then:

- Watch the `apps/worker/sync` logs for `Failed to process publication`. Each publication has its own inner transaction, so a single failure does not roll back successes.
- Re-run the per-date histogram (Phase 1 of the runbook) and confirm there are no holes left in the gap range.
- If a single publication keeps failing, fetch it manually via `VisualService` to inspect the federation response.

---

## Phase 3 — Manually enqueue `Ranking.UpdateRanking` to recalculate

After the backfill (or whenever the recalc cron has been skipping the gap):

1. Rewind the watermark on the affected `RankingSystem` so the recalc reaches back into the gap:

   ```sql
   UPDATE ranking."RankingSystems"
   SET "calculationLastUpdate" = '<pre_gap_date>',
       "updateLastUpdate"      = '<pre_gap_date>'
   WHERE id = '<SYSTEM_ID>';
   ```

2. Confirm `calculateUpdates = true` on the system. If it's `false`, the recalc cron is gated off entirely and so are recovery jobs.

3. Enqueue the recalc directly with **both flags `true`** — the daily cron uses `false/false` and will not fix points:

   ```ts
   rankingQueue.add('UpdateRanking', {
     systemId: '<SYSTEM_ID>',
     calculatePoints: true,
     recalculatePoints: true,
   });
   ```

4. Monitor:
   - Queue depth: `LLEN bull:ranking:wait` in Redis, or via Bull-board.
   - `apps/worker/ranking` logs for per-period progress.

> One job covers all periods between the watermark and now. This is heavy — run it during off-peak. With `recalculatePoints: true`, the same job also runs `BelgiumFlandersPointsService` (destroy + recreate `RankingPoint` per period), so points are covered too.

---

## Heads-up before you run anything

- **Don't** clear `RankingPlace` and re-sync from epoch. Federation is the source of truth and `removeInvisiblePublications` will hard-delete historic rows on the next sync if federation hides them.
- **Don't** rewind `calculationLastUpdate` all the way back to `2016-08-31` (the model default) — `getRankingPeriods` will enumerate years of intervals and saturate the queue and DB.
- **Don't** run two `Sync.SyncRanking` jobs in parallel. The `cronJob.running` guard is dead code; only Bull's job-name dedup in `CronService` prevents collisions, and that's bypassed when you enqueue directly.
- **Don't** disable `calculateUpdates` on the system to "make it stop" — that gates off all recovery jobs too.
- **Don't** assume the daily cron will heal it on its own. Without a watermark rewind it never re-enters the gap.

## Full runbook

For diagnosis queries, verification queries, and Phase 4/5/6, see [`ranking-sync-recovery.md`](./ranking-sync-recovery.md). For the system overview and the watermark/window mismatch in depth, see [`ranking-sync.md`](./ranking-sync.md) §4.A and §4.B.
