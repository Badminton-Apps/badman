# Implementation Plan: DataLoader for SubEvent / DrawCompetition / EventEntry parent FK associations

**Branch**: `025-dataloader-subevent-draw-associations` | **Date**: 2026-05-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/025-dataloader-subevent-draw-associations/spec.md`

## Summary

Replace three per-row parent-FK lookups with request-scoped DataLoaders:
- `SubEventCompetitionResolver.eventCompetition` → `EventCompetitionLoaderService` (DataLoader<string, EventCompetition>)
- `DrawCompetitionResolver.subEventCompetition` → `SubEventCompetitionLoaderService` (DataLoader<string, SubEventCompetition>)
- `EventEntryResolver.subEventCompetition` → same `SubEventCompetitionLoaderService` (shared)

For a competition page with M sub-events, K draws, and J entries, parent-entity lookups drop from M+K+J individual queries to at most 2 bulk queries (one EventCompetition, one SubEventCompetition).

**Pre-condition**: Sentry N+1 alert on any of these three resolver paths OR documented hot-path test.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20)
**Primary Dependencies**: NestJS (Scope.REQUEST), `dataloader` v2
**Storage**: PostgreSQL — `event.EventCompetitions`, `event.SubEventCompetitions`; no migrations
**Testing**: Jest via `nx test backend-graphql`
**Target Platform**: NestJS API (apps/api)
**Project Type**: NestJS GraphQL resolver (`libs/backend/graphql`)
**Performance Goals**: M+K+J individual queries → at most 2 bulk queries per competition page load
**Constraints**: Field types/nullability unchanged; existing query calls at `subEventCompetitions` that already include EventCompetition are unaffected
**Scale/Scope**: Three field resolvers in two resolver files; two new loader services

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code-First GraphQL via Sequelize Models | PASS | No new models or types |
| II. Translation Discipline | PASS | No i18n changes |
| III. Transactional Mutations | PASS | No mutations affected |
| IV. Resolver Test Discipline | APPLIES | Update spec files for SubEventCompetition and EventEntry resolvers |
| V. Legacy Frontend Boundary | PASS | No frontend changes |

## Project Structure

### Documentation (this feature)

```text
specs/025-dataloader-subevent-draw-associations/
├── plan.md     ← this file
├── research.md
├── data-model.md
└── tasks.md    ← speckit-tasks
```

### Source Code (repository root)

```text
libs/backend/graphql/src/
├── loaders/
│   ├── event-competition-loader.service.ts       (NEW)
│   └── sub-event-competition-loader.service.ts   (NEW)
└── resolvers/event/competition/
    ├── subevent.resolver.ts     (inject EventCompetitionLoaderService; replace getEventCompetition)
    └── entry.resolver.ts        (inject SubEventCompetitionLoaderService; replace getSubEventCompetition)

libs/backend/graphql/src/resolvers/event/competition/draw.resolver.ts
    (inject SubEventCompetitionLoaderService; replace getSubEventCompetition)
```

**Structure Decision**: Two new loader services added to the shared `loaders/` directory. `SubEventCompetitionLoaderService` is shared between DrawCompetition and EventEntry resolvers. `DrawCompetitionLoaderService` from feature 024 may also be reused by EventEntryResolver (which has a `drawCompetition` field) in a follow-up.

## Key Design Decisions

1. **SubEventCompetitionLoaderService shared**: Both `DrawCompetitionResolver.subEventCompetition` and `EventEntryResolver.subEventCompetition` inject the same service — if both fire in one request tick, one batch covers all FK values.
2. **SubEventCompetitions query already includes EventCompetition**: The `subEventCompetitions` root query in `subevent.resolver.ts` lines 53-59 already does `include: [{ model: EventCompetition }]`. DataLoader only benefits when sub-events come from a parent resolver without the include.
3. **EventEntry also has drawCompetition N+1**: `EventEntryResolver.drawCompetition` calls `eventEntry.getDrawCompetition()` per row — could reuse `DrawCompetitionLoaderService` from 024, but scoped out here.
4. **Pre-condition gate**: implementation blocked until signal documented.

## Complexity Tracking

No constitution violations.
