# Implementation Plan: DataLoader for RankingSystemService per-request dedup

**Branch**: `020-dataloader-ranking-system` | **Date**: 2026-05-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/020-dataloader-ranking-system/spec.md`

## Summary

Add `RankingSystemLoaderService` — a thin, request-scoped NestJS service owning one `DataLoader<string, RankingSystem>` per GraphQL request. The DataLoader batch fn calls the existing module-scoped `RankingSystemService.getById` for each unique key, collapsing N per-tick calls (one per resolver row) to 1 per unique systemId. The 16 resolver call sites that currently inject `RankingSystemService` directly are migrated to inject `RankingSystemLoaderService` instead. No DB queries change; no Sequelize models change.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20)
**Primary Dependencies**: NestJS (Scope.REQUEST DI), `dataloader` v2 (already in package.json from feature 019), Sequelize-typescript
**Storage**: N/A — no new DB access; delegates to existing `RankingSystemService` in-memory TTL cache
**Testing**: Jest via `nx test backend-graphql` and `nx test backend-ranking`
**Target Platform**: NestJS API (apps/api)
**Project Type**: NestJS module library (`@badman/backend-ranking`)
**Performance Goals**: Reduce `RankingSystemService.getById` invocations from N to K (K = distinct systemIds) per request tick
**Constraints**: Must not change public API of `RankingSystemService`; must not introduce cross-request state
**Scale/Scope**: 16 resolver call sites across `libs/backend/graphql/`; single-digit unique systemIds per request in production

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code-First GraphQL via Sequelize Models | ✅ PASS | No new Sequelize models or GraphQL types introduced |
| II. Translation Discipline | ✅ PASS | No i18n changes |
| III. Transactional Mutations | ✅ PASS | No new mutations; feature is query-path only |
| IV. Resolver Test Discipline | ✅ APPLIES | `RankingSystemLoaderService` unit tests must use `jest.spyOn` on `RankingSystemService.getById`; resolver tests that currently spy on `getById` must be updated to spy on the loader instead |
| V. Legacy Frontend Boundary | ✅ PASS | No frontend changes |

## Project Structure

### Documentation (this feature)

```text
specs/020-dataloader-ranking-system/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
└── tasks.md             ← Phase 2 output (speckit-tasks)
```

### Source Code (repository root)

```text
libs/backend/ranking/src/
├── services/
│   ├── system/
│   │   ├── ranking-system.service.ts          (unchanged)
│   │   └── ranking-system-loader.service.ts   (NEW)
│   └── index.ts                               (export new service)
└── ranking.module.ts                          (declare + export new service)

libs/backend/graphql/src/resolvers/
├── ranking/
│   ├── lastRankingPlace.resolver.ts           (inject loader instead of service)
│   ├── rankingPoint.resolver.ts               (inject loader instead of service)
│   └── rankingSystemGroup.resolver.ts         (inject loader instead of service)
├── event/competition/
│   ├── assembly.resolver.ts                   (inject loader instead of service)
│   ├── subevent.resolver.ts                   (inject loader instead of service)
│   └── encounter.resolver.ts                  (inject loader instead of service)
└── [remaining 10 call sites — identified during implementation]
```

**Structure Decision**: Single NestJS library addition (`@badman/backend-ranking`). New service exported from the same module as `RankingSystemService`; all consumers already import `RankingModule`.

## Phase 0: Research

See [research.md](research.md).

## Phase 1: Design

See [data-model.md](data-model.md).

### Key Design Decisions

1. **Scope**: `@Injectable({ scope: Scope.REQUEST })` on `RankingSystemLoaderService`. NestJS propagates REQUEST scope to all dependents — resolver methods are already request-scoped via the HTTP request lifecycle, so no additional wiring needed.

2. **DataLoader construction**: One `new DataLoader<string, RankingSystem | null>(batchFn, { cache: true })` created in the constructor. `cache: true` (default) provides within-request memoization on top of the per-tick batching.

3. **Batch fn**: Receives `readonly string[]` of deduplicated systemIds. Calls `Promise.all(keys.map(id => this.rankingSystemService.getById(id)))`. Returns `(RankingSystem | null)[]` in input-key order — DataLoader contract satisfied because `getById` already returns null for missing ids.

4. **Null propagation**: `getById(null | undefined)` returns `null` immediately (guard already in service). Resolver call sites must guard before `loader.load(id)` if `systemId` can be null.

5. **Module wiring**: `RankingSystemLoaderService` added to `providers` and `exports` of `RankingModule`. No new module created.

6. **Migration path**: Each resolver call site changes from `this.rankingSystemService.getById(id)` to `this.rankingSystemLoaderService.load(id)`. Constructor injection token changes from `RankingSystemService` to `RankingSystemLoaderService`.

## Complexity Tracking

No constitution violations.
