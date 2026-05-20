# Implementation Plan: DataLoader for RankingPoint.player field resolver

**Branch**: `022-dataloader-ranking-point-player` | **Date**: 2026-05-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/022-dataloader-ranking-point-player/spec.md`

## Summary

Replace the per-row `rankingPoint.getPlayer()` call in `RankingPointResolver.player` with a request-scoped `PlayerLoaderService` (DataLoader<string, Player>). All `playerId` values arriving in one microtask tick are batched into a single `Player.findAll` with an `IN` clause, then each row receives its matching Player. Creates the shared `PlayerLoaderService` that feature 023 (RankingLastPlace.player) will also reuse.

**Pre-condition**: Sentry N+1 alert on `RankingPoint.player` resolver OR documented hot-path manual test result.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20)
**Primary Dependencies**: NestJS (Scope.REQUEST), `dataloader` v2 (already in package.json)
**Storage**: PostgreSQL — `public.Players` table; no migrations
**Testing**: Jest via `nx test backend-graphql`
**Target Platform**: NestJS API (apps/api)
**Project Type**: NestJS GraphQL resolver (`libs/backend/graphql`)
**Performance Goals**: Reduce Player DB lookups from N to 1 per request (N = rows in RankingPoint list)
**Constraints**: Must not change RankingPoint.player field type or nullability
**Scale/Scope**: One field resolver (line 42-44); PlayerLoaderService shared with feature 023

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code-First GraphQL via Sequelize Models | PASS | No new models or types |
| II. Translation Discipline | PASS | No i18n changes |
| III. Transactional Mutations | PASS | No mutations; query-path only |
| IV. Resolver Test Discipline | APPLIES | Update rankingPoint.resolver.spec.ts: spy on PlayerLoaderService.load instead of getPlayer() |
| V. Legacy Frontend Boundary | PASS | No frontend changes |

## Project Structure

### Documentation (this feature)

```text
specs/022-dataloader-ranking-point-player/
├── plan.md     ← this file
├── research.md
├── data-model.md
└── tasks.md    ← speckit-tasks
```

### Source Code (repository root)

```text
libs/backend/graphql/src/
├── loaders/
│   └── player-loader.service.ts      (NEW — shared request-scoped DataLoader for Player)
├── graphql.module.ts                  (register PlayerLoaderService)
└── resolvers/ranking/
    ├── rankingPoint.resolver.ts       (inject PlayerLoaderService, call loader.load(playerId))
    └── rankingPoint.resolver.spec.ts  (update spy to PlayerLoaderService.load)
```

**Structure Decision**: New `libs/backend/graphql/src/loaders/` directory for shared request-scoped loaders. Reused by 023 (and potentially 024, 026) without additional module changes.

## Key Design Decisions

1. **PlayerLoaderService scope**: `Scope.REQUEST` — fresh instance per GraphQL request, no cross-request Player cache.
2. **Batch fn**: `Player.findAll({ where: { id: { [Op.in]: keys } } })` returning results in input-key order; maps missing ids to `null`.
3. **Null guard**: if `rankingPoint.playerId` is falsy, return `null` without calling `loader.load()`.
4. **Shared with 023**: `PlayerLoaderService` exported from `GraphqlModule` (or a new `LoadersModule`) so `LastRankingPlaceResolver` can inject the same class.
5. **Pre-condition gate**: Do NOT implement until Sentry alert or hot-path test result documented in this plan.

## Complexity Tracking

No constitution violations.
