# Tasks: Ranking Write Protection — Single Sanctioned Writer

**Input**: Design documents from `/specs/037-ranking-write-protection/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ranking-place-writer.md, quickstart.md

**Tests**: INCLUDED — the spec's quickstart defines mandatory unit suites and Constitution Principle IV mandates the resolver test pattern.

**Organization**: Tasks grouped by user story. US1+US2+US3+US4 ship together as **Release A** (one PR → `develop`); US5 is **Release B**, gated on the invariant + next bimonthly publication.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US5 from spec.md

## Phase 1: Setup

**Purpose**: Verify environment assumptions the design depends on.

- [x] T001 Verify in `node_modules/sequelize` (installed version) that `beforeBulkCreate` hook mutations to instance `dataValues` are reflected in the SQL generated for `bulkCreate({ updateOnDuplicate })` — research.md D1 depends on this; if false, the clamp hook needs an alternative for the bulk path (document finding in specs/037-ranking-write-protection/research.md)
- [ ] T002 [P] Run the pre-flight SQL from specs/037-ranking-write-protection/contracts/ranking-place-writer.md against the dev database (`npm run docker:up`, seeded) and record which systems lack `maxDiffLevels`/`amountOfLevels`; flag any production gap to the user (FR-011) — **requires live DB, environment-dependent**

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The sanctioned writer + enforcement — every user story consumes it.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Create `RankingPlaceWriterService` skeleton with the contract interface (`upsertMany`, `updateForPlayer`, `upsertOne`, `remove` — signatures per specs/037-ranking-write-protection/contracts/ranking-place-writer.md) in packages/backend-database/src/services/ranking-place-writer.service.ts, plus barrel packages/backend-database/src/services/index.ts, export from the package root index, register + export in packages/backend-database/src/database.module.ts
- [x] T004 Implement `upsertMany` pipeline in packages/backend-database/src/services/ranking-place-writer.service.ts: config guard (throw on missing `amountOfLevels`/`maxDiffLevels`), batched fill-from-previous (same-date row → latest prior RankingPlace/RankingLastPlace per category, ≤1 query per chunk), `getRankingProtected` per row, chunked `bulkCreate({ updateOnDuplicate, returning: false, hooks: false })` with 500-row default + inter-chunk delay, explicit bulk `RankingLastPlace` propagation only for `rankingDate >=` stored snapshot (contract guarantees 1–5, 7)
- [x] T005 Implement `updateForPlayer`, `upsertOne`, `remove` in packages/backend-database/src/services/ranking-place-writer.service.ts: per-player update newest-first honoring `updatePossible` loop semantics, single-row upsert with merge-then-protect, destroy + `RankingLastPlace` re-point; move the GamePlayerMembership rewrite logic out of the model into the service behind `propagateGameMemberships` (contract guarantees 6, 8)
- [x] T006 Delete after-hooks from packages/backend-database/src/models/ranking/ranking-place.model.ts (`updateLatestRankingsUpdates`, `updateGames`, `updateLatestRankingsCreate`, `updateLatestRankings`, `updateGameRanking`, the AfterDestroy body, and the commented-out block at lines 201-237); keep `asLastRankingPlace()`; add JSDoc banner pointing writes to the writer service
- [x] T007 Add clamp-only `@BeforeCreate @BeforeUpdate @BeforeUpsert @BeforeBulkCreate` static hook to packages/backend-database/src/models/ranking/ranking-place.model.ts with a module-level 5-minute cached `RankingSystem` lookup by `systemId`; warn + no-op when system unresolvable or unconfigured (data-model.md lifecycle; depends on T001 finding)
- [x] T008 [P] Add root-eslint `no-restricted-syntax` rule banning `RankingPlace.{bulkCreate,create,upsert,findOrCreate}` outside ranking-place-writer.service.ts (single inline disable there) in eslint.config.js, message linking specs/037-ranking-write-protection/contracts/ranking-place-writer.md; add a "ranking writes go through RankingPlaceWriterService" note to AGENTS.md
- [x] T009 [P] Write packages/backend-database/src/services/ranking-place-writer.service.spec.ts covering the quickstart matrix: partial row + existing values → preserved (no clobber); new player partial → derived best+maxDiff; unconfigured system → throws before any write; snapshot advances only for newer `rankingDate`; `remove` re-points snapshot; transaction passed through to every statement (mocked Sequelize statics per Constitution IV)
- [x] T010 [P] Add clamp-hook tests in packages/backend-database/src/models/ranking/ranking-place.model.spec.ts (or extend existing model spec): rogue `.save()` gets clamped; unconfigured system → warn + values untouched
- [x] T011 Build + test the package: `pnpm turbo run build test --filter=@badman/backend-database` — green before any story starts

**Checkpoint**: Writer service tested + enforcement active. Stories US1–US4 can proceed in parallel.

---

## Phase 3: User Story 1 — Stored rankings are always rule-compliant (Priority: P1) 🎯 MVP

**Goal**: Every writer (bulk import, CSV upload, GraphQL mutations, Flanders) persists only rule-compliant values, preserving previously known official values.

**Independent Test**: Import a publication where a player appears only in the singles list; stored record keeps previously known doubles/mixed (or derives when none exist), violates no spread rule, and the latest-ranking snapshot matches.

### Implementation for User Story 1

- [x] T012 [US1] Refactor apps/worker/sync/src/app/processors/sync-ranking/ranking-sync.ts: replace the chunked `RankingPlace.bulkCreate` loop (lines ~483-528) with `writer.upsertMany(instances, ranking.system, { transaction })`; move `transaction` out of the `where` object at line ~553; wire `RankingPlaceWriterService` into the sync module providers
- [x] T013 [P] [US1] Refactor packages/backend-ranking/src/services/update-ranking/update-ranking.service.ts (~lines 302-319): fetch the `RankingSystem` once per run, replace findOrCreate/update loop with `writer.upsertMany`
- [x] T014 [P] [US1] Refactor packages/backend-graphql/src/resolvers/ranking/rankingPlace.resolver.ts mutations: `newRankingPlace` → `writer.upsertOne`; `updateRankingPlace` → merge existing row + input then `writer.upsertOne` (silent clamp — no validation error, spec US1.3); `removeRankingPlace` → `writer.remove`; keep existing transaction + `hasAnyPermission` checks (Constitution III)
- [x] T015 [P] [US1] Route packages/backend-belgium/flanders/places/src/services/belgium-flanders-places.service.ts persist (`newRanking.save()` at ~line 111) through `writer.upsertOne` — consistency only, behavior unchanged
- [x] T016 [P] [US1] Test: extend/author sync spec asserting `writer.upsertMany` receives the instance array and system (spy), and that no payload row would violate the invariant, in apps/worker/sync/src/app/processors/sync-ranking/**tests**/ranking-sync.spec.ts (create if absent)
- [x] T017 [P] [US1] Test: update packages/backend-graphql/src/resolvers/ranking/rankingPlace.resolver.spec.ts per Constitution IV pattern — mutation clamps silently via writer, commits transaction, rolls back on error, rejects unauthorized
- [x] T018 [P] [US1] Test: update packages/backend-ranking/src/services/update-ranking/update-ranking.service.spec.ts (create if absent) — CSV row missing a category → writer called with partial row (derivation happens inside writer, already covered by T009)

**Checkpoint**: All writers compliant. `pnpm turbo run test --filter=@badman/backend-graphql --filter=@badman/backend-ranking --filter=worker-sync` green.

---

## Phase 4: User Story 2 — Broken repair pipeline works again (Priority: P1)

**Goal**: Check-ranking repairs players: both lookup routes work, partial scrapes accepted, correct identifiers queued.

**Independent Test**: Queue a repair job for a player whose source page lists only two categories; stored record afterwards complete + compliant.

### Implementation for User Story 2

- [x] T019 [US2] Fix apps/worker/sync/src/app/processors/check-ranking/get-ranking.processor.ts: consume the `getViaRanking` result (inspect apps/worker/sync/src/app/processors/check-ranking/pupeteer/ to use its return or call `getRanking` after navigation — the success branch currently leaves single/double/mix unassigned); replace the all-three bail at line ~116 with zero-categories-only bail; fill missing categories from `rankingPlaces[0]` last-known values; persist via `writer.updateForPlayer(player.id, primary, levels, { propagateGameMemberships: true })`; `await this.syncRanking(...)` in the job handler at line ~25
- [x] T020 [US2] Fix the repair-queue payload in apps/worker/sync/src/app/processors/sync-ranking/ranking-sync.ts line ~567: `playerId: player.playerId` (currently passes the RankingPlace id); keep the null-detection query as a tripwire that logs a warning when it finds anything (spec edge case)
- [x] T021 [P] [US2] Write apps/worker/sync/src/app/processors/check-ranking/get-ranking.processor.spec.ts: getViaRanking-success path persists levels; 1-of-3 scraped + last-known exists → last-known used; 1-of-3 + no last-known → derived; 0-of-3 → skip, no write; mocked Player/RankingSystem/RankingPlace statics + mocked pupeteer module

**Checkpoint**: Repair pipeline functional end-to-end (queue payload → scrape → partial-tolerant write).

---

## Phase 5: User Story 3 — Existing stored data repaired (Priority: P2)

**Goal**: One-off batched backfill repairs all historical rows in both tables; invariant query returns 0.

**Independent Test**: After `npx sequelize-cli db:migrate` on seeded dev DB, the invariant SQL (contracts doc) returns 0 for both tables.

### Implementation for User Story 3

- [x] T022 [US3] Write database/migrations/2026XXXXXXXXXX-backfill-ranking-protection.js (date-prefix at authoring time): raw SQL via `queryInterface.sequelize.query`, batched LIMIT 50000 loops until rowCount 0; pass 1 carry-forward latest earlier non-null value per `(playerId, systemId)` per category (window function); pass 2 derive/clamp `col = LEAST(COALESCE(col,aol), best+mdl, aol)` joined to `ranking."RankingSystems"` scoped to systems with both config values; run both passes against `ranking."RankingPlaces"` AND `ranking."RankingLastPlaces"`; `down` = documented no-op (plan.md Complexity Tracking justifies the non-transactional batching)
- [ ] T023 [US3] Validate locally per quickstart: `npm run docker:up && npm run seed:test-data && npx sequelize-cli db:migrate`, then run the invariant SQL from specs/037-ranking-write-protection/contracts/ranking-place-writer.md against both tables → expect 0; also verify `down` runs (no-op) and re-`up` is idempotent (second run touches 0 rows) — **requires live DB, environment-dependent**

**Checkpoint**: Historical data compliant on dev; migration ready for the deploy pipeline.

---

## Phase 6: User Story 4 — One rule, one implementation (Priority: P2)

**Goal**: Enrollment index calculation uses the shared rule + configured max-diff; hardcoded +2 gone; ghost players capped at worst level.

**Independent Test**: Enrollment index-calculation suite passes with `maxDiffLevels: 2` on the stub system; only the no-record expectation changes (12, was 14).

### Implementation for User Story 4

- [x] T024 [US4] Refactor packages/backend-competition/enrollment/src/services/index-calculation/index-calculation.service.ts: thread the full ranking system (cached, ~line 299) into `computeResult`; replace inline `bestRankingMin2 = min(...)+2` (lines ~458-469) with `getRankingProtected` from `@badman/utils` using `sys.maxDiffLevels ?? 2`; ghost players (no ranking record) now capped at `amountOfLevels` per clarification 2026-06-11 (FR-008)
- [x] T025 [US4] Update packages/backend-competition/enrollment/src/services/index-calculation/index-calculation.service.spec.ts: add `maxDiffLevels: 2` to the stub system; change the single no-record expectation from `amountOfLevels + 2` (14) to `amountOfLevels` (12); all other expectations unchanged

**Checkpoint**: Release A code complete. Run full gate: `pnpm turbo run lint test --affected` → green. Open PR 1 → `develop` (squash, conventional title), referencing BAD-264 + BAD-265.

---

## Phase 7: User Story 5 — Read-time patches removed (Priority: P3, Release B — GATED)

**Goal**: Delete the 9 display-time compensation patches; stored values equal displayed values.

**Independent Test**: With patches removed, API-returned ranking values equal raw stored values for sampled players including former problem cases.

**🚦 GATE (do not start until all true)**: Release A deployed to production; invariant SQL = 0 on both tables; the **next bimonthly federation publication** has synced through the new writer with the invariant still 0; tripwire log reports nothing queued (FR-009).

### Implementation for User Story 5

- [ ] T026 [US5] Verify the gate: run the invariant SQL from specs/037-ranking-write-protection/contracts/ranking-place-writer.md against production for both tables (expect 0), confirm post-publication, and record the evidence in the PR description
- [ ] T027 [P] [US5] Remove read-time patches + their system-fetch scaffolding and now-dead `!single||!double||!mix` guards from packages/backend-graphql/src/resolvers/ranking/rankingPlace.resolver.ts (lines ~40, ~59)
- [ ] T028 [P] [US5] Remove read-time patches from packages/backend-graphql/src/resolvers/player/player.resolver.ts (lines ~193, ~218, ~592, ~627)
- [ ] T029 [P] [US5] Remove read-time patch from packages/backend-graphql/src/resolvers/game/game.resolver.ts (line ~114)
- [ ] T030 [P] [US5] Remove read-time patch from packages/backend-graphql/src/resolvers/event/competition/assembly.resolver.ts (line ~56)
- [ ] T031 [US5] Remove dead enrollment fallback remnants left after T024 in packages/backend-competition/enrollment/src/services/index-calculation/index-calculation.service.ts; verify `getRankingProtected` remains only in: writer service, sync game processors, flanders services, enrollment (legitimate consumers)
- [ ] T032 [US5] Update affected resolver specs (resolvers return stored values directly) and run `pnpm turbo run lint test --affected`; spot-check SC-002/SC-003 paths (baseTeamPlayers field, assembly XLSX export, avg-level export) per quickstart step 5. Open PR 2 → `develop` referencing BAD-266

**Checkpoint**: Stored == displayed everywhere; compensation code gone.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T033 [P] Update Linear: rewrite BAD-231 + BAD-264 descriptions with the corrected analysis from specs/037-ranking-write-protection/research.md D8 (RankingSyncer primary null source; doubly-broken repair pipeline; clobber risk of naive patching); close BAD-264/BAD-265 with Release A, BAD-266 with Release B (FR-012)
- [ ] T034 [P] Optional integration test gated behind `RUN_INTEGRATION_TESTS=1` per repo convention (sentinel season 9999, self-cleaning): publication upsert where a player misses one category → existing level preserved, never null, never > best+maxDiff, in packages/backend-database/src/services/ranking-place-writer.integration.spec.ts
- [ ] T035 Run quickstart.md validation end-to-end (build, tests, dev-DB migrate, invariant 0) and `prettier --check .`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none — start immediately; T001 informs T007.
- **Foundational (Phase 2)**: blocks everything; T003 → T004 → T005 (same file, sequential); T006 → T007 (same file); T008/T009/T010 parallel after T005; T011 last.
- **US1 (Phase 3) / US2 (Phase 4) / US3 (Phase 5) / US4 (Phase 6)**: all only depend on Phase 2; can run in parallel. Exception: T020 (US2) touches ranking-sync.ts also edited by T012 (US1) — do T012 first or in the same sitting.
- **US5 (Phase 7)**: HARD-GATED on Release A deployed + invariant + next publication (calendar dependency, up to ~2 months).
- **Polish (Phase 8)**: T033 may run right after Release A merges (Linear correction doesn't wait for Release B); T034/T035 any time after Phase 2.

### User Story Dependencies

- US1, US2, US3, US4: independent of each other (US2's T020 shares one file with US1's T012 — sequence those two tasks).
- US5: depends on US1+US2+US3 being live in production (the gate).

### Parallel Opportunities

- Phase 2: T008, T009, T010 in parallel after the service exists.
- Phase 3: T013, T014, T015 (different packages) in parallel after T012; tests T016–T018 in parallel.
- Phases 3–6 as wholes can be parallelized across agents/devs after Phase 2.
- Phase 7: T027–T030 (four different resolver files) in parallel.

---

## Parallel Example: After Phase 2 completes

```bash
# Four independent workstreams:
Task: "US1 — refactor writers onto RankingPlaceWriterService (T012-T018)"
Task: "US2 — fix repair pipeline (T019-T021)"   # coordinate T020 with T012 (same file)
Task: "US3 — backfill migration (T022-T023)"
Task: "US4 — enrollment consolidation (T024-T025)"
```

---

## Implementation Strategy

### MVP = Release A core (US1)

1. Phase 1 + Phase 2 (writer service is the heart of the feature).
2. Phase 3 (US1) → stored data compliant for all _new_ writes. Independently testable + deployable.
3. Phases 4–6 complete Release A (repair pipeline, backfill, enrollment) → one PR → `develop`, squash-merge, conventional title (`feat(ranking): enforce write-time ranking protection`).

### Release B (separate PR, after the gate)

4. Soak through the next bimonthly publication; verify invariant.
5. Phase 7 (US5) → delete patches → PR 2 (`refactor(graphql): remove read-time ranking patches`).
6. Phase 8 closes the Linear loop.
