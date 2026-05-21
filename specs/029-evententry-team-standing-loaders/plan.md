# Implementation Plan: EventEntry Team & Standing DataLoader Batching

**Branch**: `029-evententry-team-standing-loaders` | **Date**: 2026-05-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/029-evententry-team-standing-loaders/spec.md`

## Summary

Collapse two per-row N+1 queries on `EventEntry` (the `team` and `standing` field resolvers) into request-scoped batched reads. Reuse the existing `TeamLoaderService` for `Team` by id and introduce a new `StandingLoaderService` keyed by `entryId`. Update `EventEntryResolver` (`team`, `standing`, and `enrollmentValidation`) to call the loaders. Verified by extending the existing `entry.resolver.dataloader.spec.ts`. Fixes Sentry issue 121423071.

## Technical Context

**Language/Version**: TypeScript 5.x (Nx workspace) on Node 20.
**Primary Dependencies**: NestJS 10, Apollo (code-first via `@nestjs/graphql`), Sequelize + `sequelize-typescript`, `dataloader` (already a dep — used by existing loaders under `libs/backend/graphql/src/loaders/`).
**Storage**: PostgreSQL via Sequelize (multi-schema; this feature reads from `public.Teams` and `event.Standings`).
**Testing**: Jest, configured per-lib; affected suites: `backend-graphql`.
**Target Platform**: Linux server (production API on Render), local Node 20 dev.
**Project Type**: Nx monorepo — backend GraphQL lib (`libs/backend/graphql`) + database lib (`libs/backend/database`).
**Performance Goals**: Drop `Team` reads to ≤1 per request and `Standing` reads to ≤1 per request, regardless of N entries selected on `EventEntry`.
**Constraints**: Loaders MUST be `Scope.REQUEST` so no cross-request leakage. Behavior of `team`, `standing`, `enrollmentValidation` MUST be unchanged from a client perspective.
**Scale/Scope**: One new loader service (~40 lines), four small edits in one resolver, one module change, one spec extension. No DB migration, no schema change, no GraphQL schema change.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code-First GraphQL via Sequelize Models | ✅ Pass | No new entities; uses existing `Team` and `Standing` models unmodified. |
| II. Translation Discipline | ✅ N/A | No i18n strings added or moved. |
| III. Transactional Mutations | ✅ N/A | Read-only field resolvers; no mutations. No new idempotency surface. |
| IV. Resolver Test Discipline | ✅ Pass | New batching assertions extend the existing `entry.resolver.dataloader.spec.ts` (already follows the standard pattern: `Test.createTestingModule`, mocked statics via `jest.spyOn`, `afterEach(restoreAllMocks)`). Loader unit tests follow the precedent set by sibling loaders (`team-loader.service.ts`, `sub-event-competition-loader.service.ts`). |
| V. Legacy Frontend Boundary | ✅ N/A | Backend-only change. |

No violations. Re-check after Phase 1 — still passes (design adds one service + one provider; no architecture change).

## Project Structure

### Documentation (this feature)

```text
specs/029-evententry-team-standing-loaders/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── graphql.md       # Unchanged GraphQL contract for the affected fields
└── tasks.md             # /speckit.tasks output (not created here)
```

### Source Code (repository root)

```text
libs/backend/graphql/src/
├── loaders/
│   ├── index.ts                                # add export for standing-loader
│   ├── team-loader.service.ts                  # existing — reused as-is
│   └── standing-loader.service.ts              # NEW — request-scoped Standing batcher
└── resolvers/event/
    ├── event.module.ts                         # register TeamLoaderService + StandingLoaderService
    ├── entry.resolver.ts                       # rewrite team(), standing(), enrollmentValidation()
    └── entry.resolver.dataloader.spec.ts       # extend with team + standing batching tests

libs/backend/database/src/models/event/
└── standing.model.ts                           # READ-ONLY — confirms entryId FK
```

**Structure Decision**: Nx monorepo, backend-only change scoped to `libs/backend/graphql`. No new project, no new lib, no migration.

## Complexity Tracking

> No Constitution violations. Section intentionally empty.
