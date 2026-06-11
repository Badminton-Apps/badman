# Data Model: Ranking Write Protection

**Feature**: 037-ranking-write-protection | **Date**: 2026-06-11

No schema changes. This feature changes _write semantics and lifecycle_, not table shapes.

## Entities

### RankingPlace (`ranking."RankingPlaces"`) — existing, semantics change

A player's ranking in one system at one publication date.

| Field                                                      | Type                    | Rule after this feature                                                                                                                                   |
| ---------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                                       | UUID PK                 | unchanged                                                                                                                                                 |
| `playerId`                                                 | UUID FK → Player        | unchanged                                                                                                                                                 |
| `systemId`                                                 | UUID FK → RankingSystem | unchanged                                                                                                                                                 |
| `rankingDate`                                              | DATE                    | unchanged; uniqueness key with playerId+systemId                                                                                                          |
| `single` / `double` / `mix`                                | INT                     | **INVARIANT: never NULL; `max(s,d,m) ≤ min(s,d,m) + system.maxDiffLevels`; all ≤ `system.amountOfLevels`** — for every system with both config values set |
| `singlePoints/Rank`, `doublePoints/Rank`, `mixPoints/Rank` | INT                     | unchanged (source-provided, may be NULL)                                                                                                                  |
| `singleInactive` / `doubleInactive` / `mixInactive`        | BOOL                    | unchanged                                                                                                                                                 |
| `updatePossible`                                           | BOOL                    | unchanged                                                                                                                                                 |

**Lifecycle change**: all creates/updates flow through `RankingPlaceWriterService`. Model after-hooks (`AfterCreate/AfterUpdate/AfterUpsert/AfterBulkCreate` → RankingLastPlace propagation + GamePlayerMembership rewrite; `AfterDestroy` → last-place re-point) are **deleted**; their behavior moves into the service explicitly. New clamp-only `@BeforeCreate/@BeforeUpdate/@BeforeUpsert/@BeforeBulkCreate` hooks remain as safety net (warn + no-op for unconfigured systems).

### RankingLastPlace (`ranking."RankingLastPlaces"`) — existing, semantics change

One row per `(playerId, systemId)` mirroring the newest RankingPlace. Same level invariant as RankingPlace. No longer written by model hooks; written by the writer service in the same operation (bulk `updateOnDuplicate`, only when incoming `rankingDate >=` current snapshot date).

### RankingSystem (`ranking."RankingSystems"`) — existing, read-only here

Rule configuration owner: `amountOfLevels` (worst level), `maxDiffLevels` (max spread). **Pre-flight requirement**: both non-null for every production system; writer service throws on unconfigured systems, clamp hook skips them with a warning.

### Repair job (Bull `SyncQueue`, `Sync.CheckRanking`) — existing, payload fixed

Payload `{ playerId }` — must carry a **Player** id (bug: import step currently sends the RankingPlace id).

### EventEntry.meta.competition.players — existing, untouched

Enrollment-time level snapshots. Future enrollments inherit compliant values via the enrollment consolidation; historical snapshots intentionally not migrated.

## Invariant (the testable core)

For both ranking tables, for every system with `amountOfLevels` and `maxDiffLevels` configured:

```text
single, double, mix are all NOT NULL
AND GREATEST(single,double,mix) <= LEAST(single,double,mix) + maxDiffLevels
AND GREATEST(single,double,mix) <= amountOfLevels
```

Violation count = 0 is the Release B gate and the permanent data-quality check (SQL in [contracts/ranking-place-writer.md](contracts/ranking-place-writer.md)).

## Derivation rule (single implementation: `getRankingProtected` in `@badman/utils`)

1. Missing category → `amountOfLevels`.
2. Every category clamped to `best + maxDiffLevels` (best = numeric minimum).
3. Every category capped at `amountOfLevels`.

Preceded at write time by **fill-from-previous**: existing same-date row value, else latest prior value per category — so known official values are never replaced by derived ones.

## State transitions

```text
Publication import row (partial categories)
  └─ fill same-date existing → fill latest-prior → protect → upsert → propagate snapshot

Repair scrape (≥1 category found)
  └─ scraped values → fill latest-prior → protect → update rows (newest-first until updatePossible) → propagate snapshot + game memberships

Admin create/edit (any values)
  └─ merge with existing row (edit) → protect (silent clamp) → upsert → propagate snapshot

Backfill (one-off, historical rows)
  └─ pass 1 carry-forward per category → pass 2 derive/clamp (set-based SQL, no hooks)
```
