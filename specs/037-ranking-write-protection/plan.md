# Implementation Plan: Ranking Write Protection — Single Sanctioned Writer

**Branch**: `037-ranking-write-protection` | **Date**: 2026-06-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/037-ranking-write-protection/spec.md`

## Summary

Stored `RankingPlace`/`RankingLastPlace` rows must always satisfy the Badminton Vlaanderen derivation rule (missing category → derived from best + `system.maxDiffLevels`, capped at `system.amountOfLevels`). Today no writer enforces it; 9 read-time resolver patches and an inline enrollment copy compensate. Approach: a new `RankingPlaceWriterService` in `@badman/backend-database` becomes the only sanctioned writer (batched fill-from-previous → `getRankingProtected` → chunked bulk upsert → explicit `RankingLastPlace` propagation, replacing the model's after-hooks), backed by clamp-only before-hooks as a safety net and an eslint ban on direct writes. All 5 writers are refactored onto it; the check-ranking repair pipeline's two latent bugs are fixed; enrollment consolidates onto the shared util; a two-pass batched backfill repairs historical rows. Release B (delete the 9 read patches) ships only after the next bimonthly federation publication syncs cleanly with the invariant at zero.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js (NestJS 10)
**Primary Dependencies**: NestJS, Sequelize + sequelize-typescript (v6), Apollo GraphQL (code-first), Bull (Redis), Puppeteer (check-ranking scraper), `@badman/utils` (`getRankingProtected`)
**Storage**: PostgreSQL, multi-schema; affected tables `ranking."RankingPlaces"`, `ranking."RankingLastPlaces"`, config in `ranking."RankingSystems"`
**Testing**: Jest per package (mocked Sequelize statics per Constitution Principle IV); optional integration suite gated behind `RUN_INTEGRATION_TESTS=1`
**Target Platform**: Linux server (Render) — API + worker apps
**Project Type**: Backend Turborepo monorepo (apps/ + packages/)
**Performance Goals**: Bulk publication import unchanged: 500-row chunks, inter-chunk delay, no added per-row queries (fill-from-previous is one batched query per chunk); backfill bounded batches (50k rows/statement) over millions of rows without long locks
**Constraints**: Sync transaction is lock-exhaustion sensitive; `getRankingProtected` throws when system lacks `amountOfLevels`/`maxDiffLevels`; migrations must not fire model hooks; publications land only every ~2 months (gates Release B)
**Scale/Scope**: ~millions of RankingPlace rows; 5 writer call sites; 9 read-patch call sites; 1 enrollment service; 1 backfill migration; 2 releases

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                                  | Status       | Notes                                                                                                                                                                                                                                                                       |
| ------------------------------------------ | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Code-First GraphQL via Sequelize Models | PASS         | No new entities; existing models untouched in shape. New service lives beside models in `@badman/backend-database`.                                                                                                                                                         |
| II. Translation Discipline                 | PASS         | No i18n changes.                                                                                                                                                                                                                                                            |
| III. Transactional Mutations               | PASS         | `RankingPlaceWriterService` methods accept and honor the caller's `transaction`; GraphQL mutations keep their existing transaction + permission checks, only the persist call changes. No new mutations; no idempotency-key surface changes.                                |
| IV. Resolver Test Discipline               | PASS         | Resolver spec updates follow the reference pattern (mocked statics, fake transaction, `hasAnyPermission` fn). New service specs use the same conventions.                                                                                                                   |
| V. Frontend Separate Repo                  | PASS         | Backend-only change.                                                                                                                                                                                                                                                        |
| Migrations transactional (Tech Stack)      | ⚠ JUSTIFIED | Backfill migration runs batched raw-SQL statements in a loop instead of one all-encompassing transaction — see Complexity Tracking. Each batch statement is atomic; `down` is a documented no-op (derived values indistinguishable from official — irreversible by design). |

**Post-Phase-1 re-check**: PASS — design introduces one new injectable service + one migration; no constitution-violating structures.

## Project Structure

### Documentation (this feature)

```text
specs/037-ranking-write-protection/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── ranking-place-writer.md   # Service contract + invariant SQL
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
packages/backend-database/src/
├── services/
│   ├── ranking-place-writer.service.ts        # NEW — single sanctioned writer
│   ├── ranking-place-writer.service.spec.ts   # NEW
│   └── index.ts                               # NEW barrel
├── database.module.ts                         # register + export service
└── models/ranking/
    ├── ranking-place.model.ts                 # delete after-hooks; add clamp before-hooks
    └── ranking-last-place.model.ts            # unchanged shape

apps/worker/sync/src/app/processors/
├── sync-ranking/ranking-sync.ts               # use writer; fix :567 playerId, :553 transaction-in-where
└── check-ranking/get-ranking.processor.ts     # fix dead getViaRanking branch; partial-scrape semantics; use writer

packages/backend-ranking/src/services/update-ranking/update-ranking.service.ts   # use writer
packages/backend-graphql/src/resolvers/ranking/rankingPlace.resolver.ts          # mutations use writer (Release A); query patches deleted (Release B)
packages/backend-graphql/src/resolvers/player/player.resolver.ts                 # patches deleted (Release B)
packages/backend-graphql/src/resolvers/game/game.resolver.ts                     # patch deleted (Release B)
packages/backend-graphql/src/resolvers/event/competition/assembly.resolver.ts    # patch deleted (Release B)
packages/backend-belgium/flanders/places/src/services/belgium-flanders-places.service.ts  # route through writer (consistency)
packages/backend-competition/enrollment/src/services/index-calculation/index-calculation.service.ts  # shared rule + maxDiffLevels

database/migrations/2026XXXXXXXXXX-backfill-ranking-protection.js   # NEW two-pass batched backfill
eslint.config.js (root)                                             # no-restricted-syntax ban on direct RankingPlace writes
```

**Structure Decision**: Service placed in `packages/backend-database` (lowest common layer; `backend-ranking` already imports the flanders package, so placing it there would create a package cycle once flanders adopts the writer). All consumers already depend on `@badman/backend-database`.

## Complexity Tracking

| Violation                                                                                                | Why Needed                                                                                                                                                                                                                                                                               | Simpler Alternative Rejected Because                                                                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backfill migration not wrapped in a single transaction (batched 50k-row raw-SQL loop; `down` is a no-op) | Millions of rows; a single transaction holds long locks against live sync/API traffic, and interrupted mega-transactions are the documented failure mode the CI migrate workflow guards against. Derived values are indistinguishable from official ones, so a true `down` cannot exist. | Single transactional `UPDATE` over both tables — rejected: lock duration and WAL bloat on production-scale tables; per-row model-based update — rejected: fires heavy after-hooks per row (RankingLastPlace + GamePlayerMembership rewrites). Each batch statement remains individually atomic. |
| Clamp logic duplicated once in SQL (backfill) in addition to `getRankingProtected`                       | One-off migration cannot import the TS util; SQL formula (`LEAST(COALESCE(col,aol), best+mdl, aol)`) is the proven equivalent of the util and is exercised against the invariant query.                                                                                                  | Script-app backfill importing the util — rejected: heavier operational surface (deploy + run + monitor a one-off app) for pure arithmetic expressible in two set-based passes.                                                                                                                  |
