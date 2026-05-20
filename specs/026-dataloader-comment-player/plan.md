# Implementation Plan: DataLoader for Comment.player field resolver

**Branch**: `026-dataloader-comment-player` | **Date**: 2026-05-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/026-dataloader-comment-player/spec.md`

## Summary

Replace `comment.getPlayer()` at `comment.resolver.ts:47-49` with the shared `PlayerLoaderService` (DataLoader<string, Player>) introduced by feature 022. If 022 is already merged, this feature is a one-line constructor injection + one-line field resolver change. N Player DB lookups per comment list collapse to 1. Lowest-priority opt-in; implementation blocked until Sentry signal or hot-path test.

**Pre-condition**: Sentry N+1 alert on `Comment.player` resolver OR documented hot-path test.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20)
**Primary Dependencies**: NestJS (Scope.REQUEST), `dataloader` v2; `PlayerLoaderService` from 022
**Storage**: PostgreSQL — `public.Players`; no migrations
**Testing**: Jest via `nx test backend-graphql`
**Target Platform**: NestJS API (apps/api)
**Project Type**: NestJS GraphQL resolver (`libs/backend/graphql`)
**Performance Goals**: N Player DB lookups → 1 per comment list request
**Constraints**: Comment.player field type/nullability unchanged
**Scale/Scope**: One field resolver in comment.resolver.ts; trivial if 022 already merged

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code-First GraphQL via Sequelize Models | PASS | No new models or types |
| II. Translation Discipline | PASS | No i18n changes |
| III. Transactional Mutations | PASS | No mutations affected |
| IV. Resolver Test Discipline | APPLIES | Update comment.resolver.spec.ts: spy on PlayerLoaderService.load |
| V. Legacy Frontend Boundary | PASS | No frontend changes |

## Project Structure

### Documentation (this feature)

```text
specs/026-dataloader-comment-player/
├── plan.md     ← this file
├── research.md
├── data-model.md
└── tasks.md    ← speckit-tasks
```

### Source Code (repository root)

```text
libs/backend/graphql/src/
├── loaders/
│   └── player-loader.service.ts      (from 022 — not changed here)
└── resolvers/comment/
    ├── comment.resolver.ts            (inject PlayerLoaderService; replace comment.getPlayer())
    └── comment.resolver.spec.ts       (update spy)
```

**Structure Decision**: Minimal — one resolver file changed. PlayerLoaderService already available from 022.

## Key Design Decisions

1. **Reuse PlayerLoaderService from 022** — same batch fn, same Scope.REQUEST lifecycle. No new service needed.
2. **Null guard**: `comment.playerId` may be null (anonymous comments). Return `null` without calling `loader.load()`.
3. **EntryCompetitionPlayersResolver also has Player N+1**: `EntryCompetitionPlayersResolver.player` at `entry.resolver.ts:190-193` calls `Player.findByPk(eventEntryPlayer.id)` per row — same pattern, same fix. Low-effort bonus addition if pre-condition is met.
4. **Sequencing**: Implement after 022 merges. If implementing before 022, create `PlayerLoaderService` in this PR.

## Complexity Tracking

No constitution violations.
