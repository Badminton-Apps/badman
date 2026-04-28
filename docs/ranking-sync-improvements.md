# Ranking Sync — Improvement Plan

Companion to [ranking-sync.md](./ranking-sync.md) (system overview) and [ranking-sync-recovery.md](./ranking-sync-recovery.md) (recovery runbook). This document is the forward-looking work plan that operationalizes the *Prevention* section of the recovery runbook into phased, shippable work.

## Why this plan, in this order

Last incident: sync was silently broken for weeks; "just re-run the sync from an older date" did not fix user-visible rankings because the watermark had already advanced past the gap and the recalc cron was gated off. Recovery was fully manual.

Goal: make the ranking sync as resilient and observable as the encounter-sync became after its Feb–Mar 2026 hardening pass (commits `b4f6a3cbb`, `35285070e`, `39dad1ce1`, `c8c9bb071`, `e7446179b`, `8842b7358`, `874bbe20e`).

Phase order is deliberate:

1. **Stability first** — make the system fail safely and recover deterministically. The single Phase 1.2 watermark fix alone prevents the current incident from recurring.
2. **Monitoring second** — once failure modes are well-shaped, give them somewhere to land (Sentry, structured logs, heartbeat).
3. **Tests third** — lock current behaviour with a regression net *before* refactoring touches the same code paths.
4. **Organization fourth** — decompose with the safety net from Phase 3 in place.
5. **Performance last** — easy wins after the shape is right; risky in the current monolithic shape.

---

## Phase 1 — Stability & Reliability (replicate encounter-sync patterns)

### 1.1 Typed error hierarchy
- New file: `apps/worker/sync/src/app/processors/sync-ranking/sync-ranking.errors.ts`. Mirror [enter-scores.errors.ts](../apps/worker/sync/src/app/processors/enter-scores/enter-scores.errors.ts).
- `RankingSyncErrorCode` enum: `FEDERATION_UNREACHABLE`, `FEDERATION_BAD_RESPONSE`, `RANKING_NOT_FOUND`, `CATEGORIES_FETCH`, `PUBLICATIONS_FETCH`, `POINTS_FETCH`, `PLAYER_RESOLUTION`, `PLACE_UPSERT`, `WATERMARK_WRITE`, `REMOVE_INVISIBLE`, `INNER_TX_FAILED`.
- `RankingSyncPhase` enum: `ranking_fetch | categories_fetch | publications_fetch | watermark_write | remove_invisible | points_processing | place_upsert | queue_missing`.
- `RankingSyncError extends Error` with `code`, `phase`, `cause`, optional `publicationDate`, optional `categoryCode`.
- Dedicated `FederationUnreachableError` for VR_API network failures (clone the `ToernooiUnreachableError` pattern from commit `e7446179b`).

### 1.2 Move watermark write to AFTER successful processing
> The single most impactful change in this entire plan. Solves the recurrence of the incident that prompted this document.

- Remove `system.calculationLastUpdate = pubs.at(-1).date` from `getPublications()` ([ranking-sync.ts:160](../apps/worker/sync/src/app/processors/sync-ranking/ranking-sync.ts#L160)).
- Add a final pipeline step `commitWatermark` that runs after the inner publication loop succeeds. It sets watermark to `processedPublications.at(-1).date` in its own short transaction.
- A failed run leaves the watermark untouched, so the next run automatically retries the gap. No more silent divergence between "what the federation knows" and "what we processed".

### 1.3 Drop the OUTER transaction span
- [sync-ranking.processor.ts:38](../apps/worker/sync/src/app/processors/sync-ranking/sync-ranking.processor.ts#L38) opens a transaction that stays alive across the entire inner publication loop. Remove it.
- Each step opens its own short-lived transaction. The inner publication loop already has a per-publication transaction — keep that.
- `removeInvisiblePublications` runs in its own transaction (or one transaction per hidden date — both are idempotent).

### 1.4 Soft-delete instead of hard-delete in `removeInvisiblePublications`
- New migration: add `hidden_at` timestamp column to `RankingPlace`.
- Replace `RankingPlace.destroy(...)` ([ranking-sync.ts:214](../apps/worker/sync/src/app/processors/sync-ranking/ranking-sync.ts#L214)) with `RankingPlace.update({ hiddenAt: new Date() }, ...)`.
- All read queries filter `hiddenAt IS NULL` (or via a default scope on the model). Federation visibility flips become reversible.

### 1.5 Fail-fast classification on federation errors
- Wrap `VisualService` calls in a small classifier:
  - axios `ECONNREFUSED` / `ETIMEDOUT` / 5xx → `FederationUnreachableError` (transient, allow Bull retry budget).
  - 4xx → `FederationBadResponseError` (permanent, fail immediately, do not retry).
  - XML parse error → `FederationBadResponseError`.
- Bull `attempts: 3` only applies to transient. Permanent failures show up in Sentry on the first try.

### 1.6 Replace dead `cronJob.running` guard
- [sync-ranking.processor.ts:51](../apps/worker/sync/src/app/processors/sync-ranking/sync-ranking.processor.ts#L51) reads `cronJob.running` but nothing in the file ever sets it to `true`. Either set/unset in the try/finally or remove the field and rely on the Bull job-name dedup at [cron.ts:108](../libs/backend/orchestrator/src/crons/cron.ts#L108).

### 1.7 Per-publication idempotency audit table
- New table `ranking.ranking_publication_sync` (migration): `publication_code`, `system_id`, `ranking_date`, `processed_at`, `status` (`pending|completed|failed`), `row_count`, `error_code`.
- Insert/update in the same inner transaction that upserts `RankingPlace` rows for that publication. `status='completed'` short-circuits re-processing on retry unless an explicit `force` flag is set.
- This is what enables true resumability after Phase 4.3.

### 1.8 Surface silently-swallowed errors
- [ranking-place.model.ts:442](../libs/backend/database/src/models/ranking/ranking-place.model.ts#L442) `updateGameRanking` catches and `console.error`s. Replace with `Sentry.captureException` + structured logger; do not swallow on the failure path of bulk operations. The `console.error` predates the Sentry integration.

---

## Phase 2 — Monitoring & Observability

### 2.1 Sentry init for `apps/worker/ranking`
- New file `apps/worker/ranking/src/instrument.ts` mirroring [apps/worker/sync/src/instrument.ts](../apps/worker/sync/src/instrument.ts). Same DSN (`SENTRY_DSN`), production-only.
- Wire `SentryModule.forRoot()` + `SentryGlobalFilter` in [apps/worker/ranking/src/app/app.module.ts](../apps/worker/ranking/src/app/app.module.ts).
- Add a `GlobalConsumer` for `RankingQueue` — copy [apps/worker/sync/src/app/processors/global.ts](../apps/worker/sync/src/app/processors/global.ts) verbatim, swap `SyncQueue` → `RankingQueue`. Same `@OnGlobalQueueError` / `@OnGlobalQueueFailed` shape with fingerprint grouping by job name + error identifier.

### 2.2 Phase tracking in `RankingSyncer`
- Add `private _currentPhase: RankingSyncPhase` field on `RankingSyncer` (mirror the `_currentPhase` in [enter-scores.processor.ts](../apps/worker/sync/src/app/processors/enter-scores/enter-scores.processor.ts) line 32).
- Set at the start of every step. On thrown error, wrap in `RankingSyncError({ phase: this._currentPhase, ... })`.

### 2.3 Sentry context + fingerprint per failure
- In the global handler, fingerprint = `['ranking-sync', errorCode, phase]` so distinct failure modes become distinct Sentry issues (pattern from commit `c8c9bb071`).
- `Sentry.setContext('ranking_sync', { systemId, systemName, currentPhase, publicationDate, categoryCode, processedCount, totalCount })`.
- Reuse `getErrorIdentifier()` ([global.ts:103](../apps/worker/sync/src/app/processors/global.ts#L103)).

### 2.4 Structured logging instead of string interpolation
- Convert `this.logger.log(\`Processing ${publication.name}...\`)` to `this.logger.log({ msg: 'processing publication', publicationName, publicationDate, index, total })`. The Winston/Logtail stack already passes structured fields through ([libs/backend/logging/src/logging.module.ts](../libs/backend/logging/src/logging.module.ts)).

### 2.5 Per-run metrics
- Emit at job-end: `publications_discovered`, `publications_processed`, `publications_skipped`, `players_created`, `places_upserted`, `duration_ms`, `errors_by_code`. Tagged for Logtail filtering. Also use these for trend dashboards — a sudden drop to zero or one publication per run is the early warning we missed last time.

### 2.6 Heartbeat alert
- New cron `RankingSystemHealthCheck` runs daily. For each system with `calculate_updates=true`, alert via Sentry warning if `now - calculation_last_update > 2 × calculation_interval`. Catches "sync silently broken" before users notice. This is the alert we wished we'd had.

---

## Phase 3 — Testing the current implementation

> Tests land *before* Phase 4 refactoring. They lock current behaviour so the refactor is provably non-regressive.

### 3.1 Unit tests for `RankingSyncer` steps
- New folder: `apps/worker/sync/src/app/processors/sync-ranking/__tests__/`.
- One spec per step:
  - `get-rankings.spec.ts` — happy path; `system==null` branch; default `subWeeks(now,1)` vs explicit `start`.
  - `get-publications.spec.ts` — visible-only filter, sort, `usedForUpdate` classification with `updateMonths` and `fuckedDates*`, watermark write (post-1.2 the watermark moves; the spec must move with it).
  - `process-single-publication.spec.ts` — new player creation, existing player path, `correctWrongPlayers` mapping, chunked `bulkCreate` with `updateOnDuplicate`, missing memberId branch.
  - `remove-invisible-publications.spec.ts` — pre/post Phase 1.4 (destroy → soft-delete).
- Pattern: copy [sync-events.processor.spec.ts](../apps/worker/sync/src/app/processors/sync-events/__tests__/sync-events.processor.spec.ts) — `Test.createTestingModule`, mocked Sequelize transaction (`{ commit, rollback }`), `jest.spyOn(Model, 'method')`, fake `VisualService`.

### 3.2 Unit tests for `SyncRankingProcessor`
- `sync-ranking.processor.spec.ts` — `cronJob.amount++/--` lifecycle, OUTER transaction commit/rollback paths (until Phase 1.3 lands and removes them), `startLockRenewal` invocation, error rethrow.
- Mirror [global.spec.ts](../apps/worker/sync/src/app/processors/__tests__/global.spec.ts).

### 3.3 Pure-function tests for guards / utils
- `is-publication-used-for-update.spec.ts` — table-driven over all 12 months × `fuckedDates*`.
- `correct-wrong-players.spec.ts` — table-driven over the hardcoded mappings.

### 3.4 Integration test with `redis-memory-server`
- New `apps/worker/sync/src/app/processors/sync-ranking/__tests__/ranking-sync.integration.spec.ts` — copy the shape of [queue.integration.spec.ts](../apps/worker/sync/src/app/queue/__tests__/queue.integration.spec.ts). Real Bull, in-memory Redis, mocked `VisualService` HTTP layer. Coverage:
  - Full happy path.
  - Federation 500 → retry budget consumed.
  - Lock renewal extends lock past default expiry.
  - Mid-loop crash + restart heals via the audit table (after Phase 1.7).

### 3.5 Recalc pipeline tests (worker-ranking)
- `apps/worker/ranking/src/app/processors/update/update.processor.spec.ts` — currently zero specs in the entire `apps/worker/ranking/` tree. First spec to add. Cover: `getRankingPeriods` driven by `calculation_last_update`; `calculatePoints` / `recalculatePoints` flag plumbing into `BelgiumFlandersPlacesService` and `BelgiumFlandersPointsService` (both mocked).

### 3.6 Coverage gate
- Add per-folder threshold to `apps/worker/sync/jest.config.ts` and `apps/worker/ranking/jest.config.ts` — ≥70% on the ranking-related directories before Phase 4 begins. CI fails below.

---

## Phase 4 — Organization (gated on Phase 3 coverage)

### 4.1 Decompose `RankingSyncer` god-class
- New folder `apps/worker/sync/src/app/processors/sync-ranking/services/`:
  - `federation-fetcher.service.ts` — wraps `VisualService`; HTTP error classification; returns typed DTOs.
  - `publication-classifier.service.ts` — pure; filters by date range, classifies `usedForUpdate`, owns `isPublicationUsedForUpdate`.
  - `player-resolver.service.ts` — owns memberId → Player resolution, new-player creation.
  - `place-upserter.service.ts` — owns chunked `RankingPlace.bulkCreate` + retry.
  - `watermark.service.ts` — single owner of `calculationLastUpdate` / `updateLastUpdate` reads/writes; can audit each write.
  - `publication-syncer.service.ts` — coordinates per-publication inner transaction + `ranking_publication_sync` audit row (Phase 1.7).
- `RankingSyncer` becomes a thin orchestrator that wires these services in sequence.

### 4.2 Transaction management
- Inject a `TransactionRunner` helper (mirror the `TransactionManager` used in [enter-scores.processor.ts:205](../apps/worker/sync/src/app/processors/enter-scores/enter-scores.processor.ts#L205)).
- Each service method declares its transaction requirement; the orchestrator opens and closes. No long-lived OUTER transaction. Enforces single-writer per logical step and makes test setup straightforward.

### 4.3 Separate Bull jobs for separate concerns
- `Sync.DiscoverPublications` — fetches publication list, writes `ranking_publication_sync` rows in `pending`, enqueues child jobs.
- `Sync.SyncRankingPublication` — processes ONE publication; idempotent against the audit table; parallelizable.
- `Sync.FinalizeRankingSync` — writes watermark + queues recalc once all children complete (Bull job dependencies / flows).
- Eliminates the all-or-nothing OUTER transaction anti-pattern. Turns sync into a resumable DAG.

### 4.4 Fix the recalc-cron flags
- [cron.ts:163-164](../libs/backend/orchestrator/src/crons/cron.ts#L163) hardcodes `calculatePoints: false, recalculatePoints: false`. This is the reason "rerun the sync" doesn't fix points after a gap. Either:
  - flip both to `true` so the cron heals points on its own, or
  - drop the cron entirely and have `Sync.FinalizeRankingSync` enqueue `UpdateRanking` per processed publication with the right flags.

### 4.5 Move `RankingPlace` hooks out of the model
- The `@AfterCreate / @AfterUpdate / @AfterUpsert / @AfterBulkCreate` hooks at [ranking-place.model.ts](../libs/backend/database/src/models/ranking/ranking-place.model.ts) (`updateLatestRankings`, `updateGameRanking`) hide expensive Sequelize side effects from the call site. Move them to explicit service calls invoked by the orchestrator. Easier to test, easier to selectively skip during backfill, eliminates per-row fan-out on bulk operations.

---

## Phase 5 — Performance (last)

### 5.1 Parallel category fetches per publication
- 6 categories per publication currently sequential. Fire `Promise.all`. Roughly 5× wall-clock reduction per publication if VR_API tolerates 6 concurrent (likely fine; `axios-retry` already handles transient errors).

### 5.2 Drop the workaround `setTimeout` sleeps
- `setTimeout(2000)` per publication ([ranking-sync.ts:288](../apps/worker/sync/src/app/processors/sync-ranking/ranking-sync.ts#L288)) and `setTimeout(1000)` per chunk ([ranking-sync.ts:495](../apps/worker/sync/src/app/processors/sync-ranking/ranking-sync.ts#L495)) were added as memory/lock workarounds. After Phase 4 decomposition + Phase 5.4, they are not needed. Tune the Sequelize connection pool instead.

### 5.3 Single bulk `Player.findAll` per publication
- Currently 6 categories each do their own `Player.findAll({ where: { memberId: { [Op.in]: ... } } })`. Pre-collect all memberIds across the publication's 6 categories, do one `findAll`, share the result. Roughly 6× fewer DB queries per publication.

### 5.4 Disable per-row hooks during bulk operations
- `RankingPlace.bulkCreate({ ..., individualHooks: false })`. Run `updateLatestRankings` / `updateGameRanking` once at end of publication processing in batched form (after Phase 4.5 they are explicit service calls).

### 5.5 HTTP keep-alive + retry tuning
- Verify [visual.service.ts](../libs/backend/visual/src/services/visual.service.ts) axios instance uses keep-alive HTTP/HTTPS agents. Tune `axios-retry` to retry 5xx + network only, not 4xx.

### 5.6 Indexes
- Composite UNIQUE on `(rankingDate, playerId, systemId)` is already optimal for upsert. Add a partial index `WHERE update_possible = true` on `RankingPlace` to speed up the recalc-cron predicate (`getRankingPeriods` queries).

---

## Sequencing

1. Phases 1 and 2 in parallel — both surface-level, no schema-altering work apart from Phase 1.4 / 1.7 migrations.
2. Phase 3 starts immediately; tests track each Phase 1/2 change as it lands.
3. Phase 4 gated on Phase 3 reaching ≥70% coverage on the ranking files.
4. Phase 5 last — most wins assume the decomposed shape from Phase 4.

## PR breakdown (each ships value independently)

1. **PR 1** — Sentry init in `worker-ranking` + `RankingQueue` `GlobalConsumer` (Phase 2.1).
2. **PR 2** — `RankingSyncError` class + phase tracking + structured logs + Sentry context (Phase 1.1, 2.2, 2.3, 2.4).
3. **PR 3** — Tests for current code, no behaviour change (Phase 3.1–3.5).
4. **PR 4** — Watermark fix + drop OUTER transaction + audit table (Phase 1.2, 1.3, 1.7). The PR that prevents the recurrence.
5. **PR 5** — Soft-delete on hide + replace dead `running` guard + fail-fast classification + heartbeat alert (Phase 1.4, 1.5, 1.6, 2.6).
6. **PR 6** — Service decomposition + transaction manager + recalc-cron flag fix + hooks → services (Phase 4).
7. **PR 7** — Performance pass (Phase 5).

## Acceptance criteria per phase

- **Phase 1**: forced mid-loop crash → next sync run fully heals state with no manual watermark surgery. Phase 1.2 alone solves the recurrence of the current incident.
- **Phase 2**: synthetic federation 500 in staging → distinct Sentry issue grouped by `[ranking-sync, errorCode, phase]` with `systemId` + `publicationDate` in context. Heartbeat alert fires within 24h of a stuck sync.
- **Phase 3**: `nx test apps/worker/sync apps/worker/ranking` ≥70% coverage on `sync-ranking/` and the recalc processor. Integration test passes with `redis-memory-server`.
- **Phase 4**: OUTER transaction eliminated. Sync resumes from a partial run via `ranking_publication_sync` without operator intervention. Recalc cron flags fixed.
- **Phase 5**: median sync run wall-clock time reduced by ≥40%.

## Risks

- **Drop OUTER transaction (1.3) without Phase 1.2 first** worsens divergence: per-publication writes commit but watermark still advances on discovery. Phase 1.2 must land first or in the same PR.
- **Recalc cron flag flip (4.4)** will trigger heavy `BelgiumFlandersPointsService` work on first run. Time the rollout for off-peak; consider a one-shot manual run with the right flags before flipping the cron.
- **Concurrent per-publication processing (Phase 4.3 + 5.1)** risks federation rate-limit ban. Verify with VR_API operators or stage with low concurrency first.
- **Soft-delete migration (1.4)** adds a column on a hot table. Run during a maintenance window; backfill `hidden_at = NULL` is implicit but still a metadata change.
