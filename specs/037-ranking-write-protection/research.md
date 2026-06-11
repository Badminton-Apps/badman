# Research: Ranking Write Protection

**Feature**: 037-ranking-write-protection | **Date**: 2026-06-11

All unknowns were resolved during the BAD-231 investigation (full code sweep of write paths, read paths, calculation pipelines, and null-dependencies). No NEEDS CLARIFICATION items remain; spec clarifications session 2026-06-11 settled the three judgement calls.

## D1 — Where to enforce the rule

**Decision**: Explicit `RankingPlaceWriterService` (new, `packages/backend-database/src/services/`) as the only sanctioned writer; clamp-only Sequelize before-hooks as safety net; root-eslint `no-restricted-syntax` ban on direct `RankingPlace.{bulkCreate,create,upsert,findOrCreate}` outside the service.

**Rationale**:

- Naive per-writer patching is _actively wrong_ for the bulk import: `bulkCreate({ updateOnDuplicate })` overwrites existing columns, so deriving a missing category would clobber a player's real previously-known value. Correct semantics require a batched "fill missing categories from previous known values, then clamp" step — too heavy to duplicate across 4+ call sites.
- Model hooks alone: `beforeBulkCreate` does fire under `updateOnDuplicate` in Sequelize v6, but hooks are statics (no NestJS DI), would hide batched DB reads + the core rule, and `getRankingProtected` throws for systems missing config — a global hook would hard-fail unrelated writes. Hooks are kept clamp-only with a 5-min per-process system cache, warning + no-op for unconfigured systems.
- The model's existing after-hooks (RankingLastPlace propagation + GamePlayerMembership rewrites via per-row `findOrCreate` loops) are a known lock-pressure source inside the sync's long transaction; an abandoned commented-out before-hook attempt sits at `ranking-place.model.ts:201-237`. The writer service replaces them with explicit bulk statements.

**Alternatives considered**:

- _Per-writer patching (4 call sites)_ — rejected: clobber bug above + N future regressions.
- _Postgres trigger_ — rejected: rule duplicated in PL/pgSQL permanently, invisible to TS devs, two sources of truth; CHECK constraints can't join `RankingSystems`.
- _Raw-vs-derived read model (materialized view)_ — rejected: every direct-table consumer would need migrating; epic explicitly chose overwrite-at-rest.

## D2 — Fill-from-previous semantics

**Decision**: For each incoming row with missing categories: (1) existing row at same `(playerId, systemId, rankingDate)`, else (2) latest prior RankingPlace/RankingLastPlace value per category, then (3) `getRankingProtected` derives/clamps the remainder. Stale official value beats derived value.

**Rationale**: Handles both the publication-import clobber case and the check-ranking partial-scrape edge case (a previously-known category absent from one scrape should not be re-derived). Derivation is deterministic, so a carried-forward previously-derived value re-derives identically.

## D3 — Repair pipeline fixes (folded in, required regardless)

**Decision**: Fix three latent bugs:

1. `get-ranking.processor.ts:77-116` — `getViaRanking()` success branch never assigns `single/double/mix` → always bails. Consume its result.
2. `ranking-sync.ts:567` — repair queue passes `player.id` where `player` is a RankingPlace row → `Player.findByPk(rankingPlaceId)` NotFound. Pass `player.playerId`.
3. `ranking-sync.ts:553` — `transaction` nested inside `where` (bogus filter). Move to query options.
   Bail rule becomes "skip only when zero categories scraped". The null-detection query stays as a tripwire (it finding anything post-rollout indicates a writer bypassing the rule); it logs a warning.

## D4 — Backfill approach

**Decision**: Plain-JS migration in `database/migrations/`, raw SQL via `queryInterface.sequelize.query`, two passes over both `ranking."RankingPlaces"` and `ranking."RankingLastPlaces"`, batched `LIMIT 50000` loops until 0 rows:

- Pass 1 — carry-forward: latest earlier non-null value per `(playerId, systemId)` per category (window function).
- Pass 2 — derive/clamp: `col = LEAST(COALESCE(col, aol), best + mdl, aol)` with `best = LEAST(COALESCE(single,aol), COALESCE(double,aol), COALESCE(mix,aol))`, joined to `RankingSystems`, scoped to systems with both config values non-null.
  `down`: documented no-op. Raw SQL avoids firing model after-hooks over millions of rows. Per-game `GamePlayerMembership` snapshots are already write-protected and left alone.

**Alternatives considered**: script app (rejected — operational overhead for pure arithmetic); model-based update (rejected — hooks fire per row).

## D5 — Enrollment consolidation (BAD-265)

**Decision**: Thread the full ranking system (already cached 5 min) into `computeResult`; replace inline `bestRankingMin2 = min(...)+2` with `getRankingProtected` using `system.maxDiffLevels`. **Ghost players (no ranking record): capped at `amountOfLevels`** — full unification per clarification 2026-06-11; the previous uncapped `amountOfLevels + 2` "validator parity" value is intentionally abandoned. Spec fixtures get `maxDiffLevels: 2`; exactly one test expectation (no-record case) changes.

## D6 — Admin mutation semantics

**Decision**: Silently clamp (same as imports) — per clarification 2026-06-11. For `updateRankingPlace`, protect the merged existing-row + input, not the partial input alone.

## D7 — Rollout gate

**Decision**: Two releases. Release A = writer service + hook swap + 5 writer refactors + repair fixes + enrollment + eslint + backfill + pre-flight. Release B (delete 9 read patches) ships only after the **next bimonthly federation publication** syncs through the new writer with the invariant query returning 0 on both tables — per clarification 2026-06-11.

**Pre-flight** (before Release A):

```sql
SELECT id, name, "rankingSystem", "maxDiffLevels", "amountOfLevels"
FROM ranking."RankingSystems" WHERE "maxDiffLevels" IS NULL OR "amountOfLevels" IS NULL;
```

Any hit → configure values first. Test builders (`systemBuilder.ts`) don't default `maxDiffLevels`; specs must set it explicitly.

## D8 — Corrected problem analysis (feeds Linear updates, FR-012)

- Primary null source is the bulk publication import (`RankingSyncer`), not check-ranking as the epic stated; check-ranking is the (doubly broken) repair path.
- Beyond the 9 known read patches, the sweep found ~8 additional _unpatched_ raw-read paths (GraphQL `baseTeamPlayers`, assembly XLSX export, avg-level export, `Player.getCurrentRanking/getHighestRanking`, game-membership copies) — all become correct automatically once stored data is compliant.
- Enrollment-time snapshots (`EventEntry.meta`) stay as-enrolled; future enrollments produce compliant snapshots (accepted, out of scope).
- Only one code path depends on NULLs existing (the tripwire query); it degrades gracefully to a no-op detector.
