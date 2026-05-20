# Implementation Plan: DataLoader for RankingLastPlace.player field resolver

**Branch**: `023-dataloader-last-ranking-place-player` | **Date**: 2026-05-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/023-dataloader-last-ranking-place-player/spec.md`

## Summary

Replace the per-row `rankingPlace.getPlayer()` call at `lastRankingPlace.resolver.ts:55` with injection of the shared `PlayerLoaderService` introduced by feature 022. If 022 has not yet merged, this feature also creates `PlayerLoaderService`. One `Player.findAll` replaces N per-row `getPlayer()` calls. The `rankingSystem` field resolver (line 45-51) calling `rankingSystemService.getById` per row is addressed by feature 020 — out of scope here.

**Pre-condition**: Sentry N+1 alert on `RankingLastPlace.player` resolver OR documented hot-path manual test result.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20)
**Primary Dependencies**: NestJS (Scope.REQUEST), `dataloader` v2
**Storage**: PostgreSQL — `public.Players` table; no migrations
**Testing**: Jest via `nx test backend-graphql`
**Target Platform**: NestJS API (apps/api)
**Project Type**: NestJS GraphQL resolver (`libs/backend/graphql`)
**Performance Goals**: Reduce Player DB lookups from N to 1 per request for ranking-place lists
**Constraints**: Must not change RankingLastPlace.player field type or nullability
**Scale/Scope**: One field resolver at line 54-56; PlayerLoaderService shared with 022

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code-First GraphQL via Sequelize Models | PASS | No new models or types |
| II. Translation Discipline | PASS | No i18n changes |
| III. Transactional Mutations | PASS | No mutations; query-path only |
| IV. Resolver Test Discipline | APPLIES | Update lastRankingPlace.resolver.spec.ts: spy on PlayerLoaderService.load |
| V. Legacy Frontend Boundary | PASS | No frontend changes |

## Project Structure

### Documentation (this feature)

```text
specs/023-dataloader-last-ranking-place-player/
├── plan.md     ← this file
├── research.md
├── data-model.md
└── tasks.md    ← speckit-tasks
```

### Source Code (repository root)

```text
libs/backend/graphql/src/
├── loaders/
│   └── player-loader.service.ts      (from 022, or created here if 022 not merged)
└── resolvers/ranking/
    ├── lastRankingPlace.resolver.ts   (inject PlayerLoaderService, call loader.load(playerId))
    └── lastRankingPlace.resolver.spec.ts (update spy)
```

**Structure Decision**: Reuse `PlayerLoaderService` from 022. If merging before 022, create the service here and move it when 022 merges.

## Key Design Decisions

1. **Reuse PlayerLoaderService from 022** — same batch fn, same Scope.REQUEST, same module export.
2. **Null guard**: if `rankingPlace.playerId` is falsy, return `null` without calling `loader.load()`.
3. **Related**: `rankingSystem` field resolver on `LastRankingPlaceResolver` also calls `rankingSystemService.getById` per row — that N+1 is addressed by feature 020 (RankingSystemLoaderService).
4. **Pre-condition gate**: implementation blocked until Sentry signal or hot-path test documented.

## Complexity Tracking

No constitution violations.
