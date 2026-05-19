# Implementation Plan: DataLoader for EncounterCompetition home/away/drawCompetition associations

**Branch**: `024-dataloader-encounter-associations` | **Date**: 2026-05-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/024-dataloader-encounter-associations/spec.md`

## Summary

Replace three per-row Sequelize association getters in `EncounterCompetitionResolver` with request-scoped DataLoaders: `getHome()` and `getAway()` share one `TeamLoaderService` (DataLoader<string, Team>); `getDrawCompetition()` uses a `DrawCompetitionLoaderService`. For a draw with N encounters, Team lookups drop from 2N to 1 query; DrawCompetition lookups drop from N to 1. The N+1 applies when encounters come from a parent resolver without the eager-load (e.g., `DrawCompetition.encounterCompetitions`); the root `encounterCompetitions` query already eager-loads home/away.

**Pre-condition**: Sentry N+1 alert on encounter association resolvers OR documented hot-path test for a large draw.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20)
**Primary Dependencies**: NestJS (Scope.REQUEST), `dataloader` v2
**Storage**: PostgreSQL — `public.Teams`, `event.DrawCompetitions`; no migrations
**Testing**: Jest via `nx test backend-graphql`
**Target Platform**: NestJS API (apps/api)
**Project Type**: NestJS GraphQL resolver (`libs/backend/graphql`)
**Performance Goals**: 2N+N → 2 queries per draw page (teams + draw, vs home/away/draw per encounter)
**Constraints**: Field types/nullability unchanged; existing error handling (try/catch returning null) preserved
**Scale/Scope**: Three field resolvers in one resolver file; loaders reusable by other encounter resolvers

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code-First GraphQL via Sequelize Models | PASS | No new models or types |
| II. Translation Discipline | PASS | No i18n changes |
| III. Transactional Mutations | PASS | No mutations affected |
| IV. Resolver Test Discipline | APPLIES | Update encounter.resolver.spec.ts: spy on loader services instead of getHome/getAway/getDrawCompetition |
| V. Legacy Frontend Boundary | PASS | No frontend changes |

## Project Structure

### Documentation (this feature)

```text
specs/024-dataloader-encounter-associations/
├── plan.md     ← this file
├── research.md
├── data-model.md
└── tasks.md    ← speckit-tasks
```

### Source Code (repository root)

```text
libs/backend/graphql/src/
├── loaders/
│   ├── player-loader.service.ts           (from 022 — not changed)
│   ├── team-loader.service.ts             (NEW)
│   └── draw-competition-loader.service.ts (NEW)
└── resolvers/event/competition/
    ├── encounter.resolver.ts              (inject both loaders; replace getHome/getAway/getDrawCompetition)
    └── encounter.resolver.spec.ts         (update spies)
```

**Structure Decision**: Two new loader services in `loaders/`. `TeamLoaderService` may be reused by other resolvers that look up teams by id.

## Key Design Decisions

1. **TeamLoaderService**: `DataLoader<string, Team | null>` keyed by team id. Shared between `home` and `away` field resolvers — both contribute their FK to the same batch, so one `Team.findAll` covers both associations per request.
2. **DrawCompetitionLoaderService**: `DataLoader<string, DrawCompetition | null>` keyed by draw id. Used by `drawCompetition` field resolver. May be reused by feature 025.
3. **Null guard**: Field resolvers already have try/catch returning null. Replace the try/catch body with `loader.load(encounter.homeTeamId)` etc., retaining the null return on error.
4. **Out-of-scope associations**: `location`, `gameLeader`, `tempHomeCaptain`, `tempAwayCaptain`, `enteredBy`, `acceptedBy` — all have per-row getters. Explicitly excluded; address in separate features if signals warrant.
5. **Pre-condition gate**: implementation blocked until Sentry signal or hot-path test documented.

## Complexity Tracking

No constitution violations.
