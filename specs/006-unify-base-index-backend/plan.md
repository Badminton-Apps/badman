# Implementation Plan: Unify Base-Index Calculation in the Backend

**Branch**: `006-unify-base-index-backend` | **Date**: 2026-05-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/006-unify-base-index-backend/spec.md`

## Summary

Eliminate divergence between the displayed base/team index in the new Next.js frontend and the value the backend uses for enrollment validation. Today the canonical formula lives in `@badman/utils.getIndexFromPlayers` and is reused by backend validation, the entry-model recalculation hook, and the legacy Angular frontend; the new frontend reimplements it locally and drifts (BAD-119).

Approach: extract the inline snapshot-fetch + formula glue from the entry-model `BeforeCreate`/`BeforeUpdate` hook into a new `IndexCalculationService` in `@badman/backend-competition-enrollment`. Expose a single batched GraphQL query `calculateIndex(...)` that supports both base-index mode (player IDs only) and team-index mode (pre-resolved per-player components) and returns per-input results so a single bad input never fails the batch. The new frontend consumes that query (debounced + batched) and deletes its local formula. Existing backend callers (validation, hook, assembly rules, maintenance script) keep their public behaviour byte-identical (SC-006).

## Technical Context

**Language/Version**: TypeScript (Node 20.x), NestJS, GraphQL (Apollo, code-first)
**Primary Dependencies**: `@nestjs/graphql`, `@nestjs/sequelize`, `sequelize`, `@badman/utils` (canonical helper), `@badman/backend-database`, `@badman/backend-authorization`
**Storage**: PostgreSQL via Sequelize (read-only access to `RankingPlace`, `RankingSystem`, `SubEventCompetition`, `EventCompetition`, `Player`)
**Testing**: Jest (per-lib `jest.config.ts`), `@nestjs/testing`, model statics mocked via `jest.spyOn` per Constitution Principle IV
**Target Platform**: Linux server (production API on Fastify, port 5010); developer laptops via `nx run-many --target=serve`
**Project Type**: Nx monorepo, web-service backend (no new frontend code in this repo — the new Next.js app lives in `badman-frontend/`)
**Performance Goals**: SC-003 — 95p update of the displayed index within 500 ms of the last debounced input change under nominal network. SC-004 — at most one outbound batch per debounce window regardless of N teams.
**Constraints**: SC-005/SC-006 — zero numeric divergence vs. the canonical helper; byte-identical behaviour for existing backend callers. Resolver MUST require an authenticated caller (FR-006a) with no fine-grained permission gate. Per-process / batch-scoped caching only, TTL ≤ 60 s (FR-018).
**Scale/Scope**: One new service (`IndexCalculationService`), one new GraphQL query, ~4 new `@ObjectType`/`@InputType` classes, one resolver refactor (entry-model hook delegates to service), zero migrations, zero translation changes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies? | Status | Notes |
|-----------|----------|--------|-------|
| I. Code-First GraphQL via Sequelize Models | Yes | **Pass** | The new operation introduces only Apollo `@ObjectType` / `@InputType` declarations co-located with the resolver. No new persistent entity is added; no separate SDL is authored. |
| II. Translation Discipline | No (no i18n changes) | **Pass (n/a)** | Feature ships no user-visible strings on the backend. New frontend strings (loading / error states) are owned by the new-frontend repo's `translation-manager` and are out of scope for this plan. |
| III. Transactional Mutations | Partial | **Pass** | The new GraphQL operation is a **query**, not a mutation — no writes, no transaction needed. Authorization is enforced via `@User()` + a guard that rejects unauthenticated callers (FR-006a). The entry-model hook continues to honour the calling Sequelize transaction (`options?.transaction`) per its current behaviour. No idempotency clause applies (no create). |
| IV. Resolver Test Discipline | Yes | **Pass** | Resolver tests follow the reference pattern (`Test.createTestingModule`, fake `Sequelize`, `jest.spyOn` on model statics, fake `Player` with `hasAnyPermission`, `afterEach(jest.restoreAllMocks)`). Cases covered: query-returns-data, query-returns-empty (empty player set), unauth (rejected), per-input not-found returned as structured per-entry error (FR-002a), success path. Spec-level FR-016a/b/c plus this plan's Phase 1 testing strategy together satisfy. |
| V. Legacy Frontend Boundary | Yes | **Pass** | Legacy Angular frontend is explicitly out of scope (FR-015). No edits under `apps/badman/` or `libs/frontend/`. Legacy uses of `getIndexFromPlayers` are left untouched. |

No violations → no Complexity Tracking entries.

## Project Structure

### Documentation (this feature)

```text
specs/006-unify-base-index-backend/
├── plan.md              # This file
├── research.md          # Phase 0 output (this command)
├── data-model.md        # Phase 1 output (this command)
├── quickstart.md        # Phase 1 output (this command)
├── contracts/
│   └── calculate-index.graphql   # Public GraphQL contract
├── checklists/
│   └── requirements.md  # From /speckit.specify
└── tasks.md             # Created later by /speckit.tasks
```

### Source Code (repository root)

```text
libs/utils/src/lib/
├── get-index.ts                            # Canonical helper (unchanged)
└── get-index.spec.ts                       # Helper oracle — landed in this branch (37 cases)

libs/backend/competition/enrollment/src/
├── enrollment.module.ts                    # + provide & export IndexCalculationService
└── services/
    ├── index.ts                            # + barrel re-export
    └── index-calculation/                  # NEW
        ├── index.ts
        ├── index-calculation.service.ts    # NEW shared service
        ├── index-calculation.service.spec.ts   # NEW unit tests (uses helper-oracle fixtures)
        ├── index-calculation.types.ts      # Internal input/output types (not GraphQL)
        └── index-calculation.fixtures.ts   # Shared fixture export reused by parity tests

libs/backend/graphql/src/resolvers/event/competition/
├── calculate-index/                        # NEW resolver folder (mirrors enrollment-result/team-result style)
│   ├── calculate-index.resolver.ts
│   ├── calculate-index.resolver.spec.ts
│   ├── calculate-index.input.ts            # @InputType — supports both modes (FR-001)
│   ├── calculate-index.result.ts           # @ObjectType — per-input result with optional error union
│   └── index.ts
└── index.ts                                # + register resolver

libs/backend/database/src/models/event/
└── entry.model.ts                          # Edited: hook delegates to IndexCalculationService

apps/scripts/src/app/scripts/recalculate-entry-index/
└── recalculate-entry-index.service.ts      # Unchanged — behaviour preserved via the hook’s public contract
```

**Structure Decision**: Web-service backend (Nx monorepo). The new shared service lives alongside `EnrollmentValidationService` in `@badman/backend-competition-enrollment` because:

1. `EnrollmentValidationService` already imports `getIndexFromPlayers` and resolves player rankings against the same snapshot — this module already owns the snapshot-resolution patterns we are extracting.
2. The entry-model hook (`libs/backend/database/.../entry.model.ts`) cannot import from `@badman/backend-graphql` without creating a cycle, but it can import from `@badman/backend-competition-enrollment`.
3. The GraphQL resolver in `@badman/backend-graphql` consumes the service via DI, which keeps the public surface declarative and tests trivial.

The resolver folder uses the same style as `enrollment-result.object.ts` / `team-result.object.ts` — co-located `@ObjectType` next to the resolver.

## Complexity Tracking

> Not used — Constitution Check passes without violations.
