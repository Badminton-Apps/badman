# Implementation Plan: Fix RankingSystem N+1 queries and clubenrollment pug syntax error

**Branch**: `018-fix-ranking-n1-and-pug` | **Date**: 2026-05-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/018-fix-ranking-n1-and-pug/spec.md`

## Summary

Two unrelated production incidents from Sentry, fixed together because both surface under "GraphQL request fails or wastes DB work":

1. **N+1 against `ranking.RankingSystems`** — three resolvers refetch the same row(s) per parent: `Game.players` (`findOne({primary: true})` per Game), `RankingPlace.rankingSystem` (`getRankingSystem()` per RankingPlace), and `RankingLastPlace.rankingSystem` (same). Plus an in-loop `findByPk` inside `rankingPlaces()`. Fix: introduce a single `@Injectable()` `RankingSystemService` with two memoized accessors (`getPrimary()`, `getById(id)`), TTL ≤ 5 min, with explicit `invalidate()` called by the existing `RankingSystem` mutations.
2. **Pug syntax error in `clubenrollment` email** — template uses JS optional chaining (`?.`) inside pug `if`/`each` expressions, which pug 3.0.3's lexer rejects. Fix: replace `?.` with explicit `&&` null-guards in the only file under `libs/backend/mailing/src/compile/templates/` that uses it (grep-confirmed: `clubenrollment/html.pug` only).

Both fixes are read-side or template-only, so no schema migration, no GraphQL contract change. Existing `RankingModule` is already wired into `RankingResolverModule`; the new service is added there. `GameResolverModule` needs `RankingModule` added to its imports.

## Technical Context

**Language/Version**: TypeScript 5.x, Node 20 (per Sentry runtime tag `node v20.19.0`).
**Primary Dependencies**: NestJS 10, Sequelize / sequelize-typescript, Apollo GraphQL (code-first via `@nestjs/graphql`), pug 3.0.3, `nestjs-i18n`. No new runtime dependency.
**Storage**: PostgreSQL multi-schema (`ranking.RankingSystems`). No schema changes.
**Testing**: Jest per lib, resolver tests follow Constitution Principle IV (reference: `enrollmentSetting.resolver.spec.ts`).
**Target Platform**: Linux server (Render), Node 20.
**Project Type**: Nx monorepo backend lib + apps (single project tree).
**Performance Goals**: One `RankingSystems` query per unique id per HTTP request (Spec SC-001, SC-002). ≥ 20% p90 response-time drop on `PlayerEncounterCompetitions` (Spec SC-006).
**Constraints**: Cache TTL ≤ 5 min (Spec FR-008). In-process only — multi-instance correctness is acceptable because admin changes propagate within TTL. No DataLoader / no Redis (Spec Out-of-Scope).
**Scale/Scope**: `RankingSystems` cardinality is single-digit org-wide; cache size is trivial. Affected GraphQL operations are `PlayerEncounterCompetitions` and `GetClubPlayers` (hot paths).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies? | Outcome |
|-----------|----------|---------|
| I. Code-First GraphQL via Sequelize Models | No new entities | **PASS** — no models added or changed. |
| II. Translation Discipline | No i18n changes | **PASS** — `all.json` not touched. |
| III. Transactional Mutations | Only invalidation hooks attach to existing mutations | **PASS** — existing transactional patterns preserved. Cache `invalidate()` is called *after* the mutation transaction commits to avoid stale-on-rollback. No new mutations introduced. |
| IV. Resolver Test Discipline | Yes — Game / RankingPlace / RankingLastPlace tests | **PASS** — new tests for `RankingSystemService` itself; updated/new specs for the three resolvers follow the reference pattern (mock Sequelize, mock service, no real DB). |
| V. Legacy Frontend Boundary | N/A | **PASS** — backend-only change. |

No violations. **Complexity Tracking** section omitted.

## Project Structure

### Documentation (this feature)

```text
specs/018-fix-ranking-n1-and-pug/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (service contract)
│   └── ranking-system-service.md
├── checklists/
│   └── requirements.md  # Created by /speckit.specify
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

Affected paths (Nx monorepo, single project tree):

```text
libs/backend/ranking/src/
├── services/
│   ├── system/                                    # NEW
│   │   ├── ranking-system.service.ts              # NEW — cached accessor
│   │   ├── ranking-system.service.spec.ts         # NEW — unit tests
│   │   └── index.ts                               # NEW
│   └── index.ts                                   # UPDATED — re-export
├── ranking.module.ts                              # UPDATED — register + export RankingSystemService
└── index.ts                                       # UPDATED if needed for public surface

libs/backend/graphql/src/resolvers/
├── game/
│   ├── game.module.ts                             # UPDATED — import RankingModule
│   ├── game.resolver.ts                           # UPDATED — inject service (lines 102–107)
│   └── game.resolver.spec.ts                      # UPDATED or NEW
└── ranking/
    ├── ranking.module.ts                          # UNCHANGED — already imports RankingModule
    ├── rankingPlace.resolver.ts                   # UPDATED — inject service (lines 31, 52, 68)
    ├── rankingPlace.resolver.spec.ts              # NEW
    ├── lastRankingPlace.resolver.ts               # UPDATED — inject service + add constructor (line 44)
    ├── lastRankingPlace.resolver.spec.ts          # NEW
    ├── rankingSystem.resolver.ts                  # UPDATED — invalidate() after each mutation commit
    └── rankingSystem.resolver.spec.ts             # UPDATED if it exists (verify in Phase 1)

libs/backend/mailing/src/compile/templates/clubenrollment/
└── html.pug                                       # UPDATED — remove `?.` (lines 33, 46)
```

**Structure Decision**: Standard Nx monorepo layout, edits in place. No new lib, no new app. The cached accessor lives under `libs/backend/ranking` because that's where `RankingSystem`-domain services already live (`PointsService`, `CalculationService`, `PlaceService`) and `RankingModule` is already imported by the GraphQL ranking module.

## Post-Design Constitution Re-check

After Phase 1 (data-model + contract + quickstart), the design holds against every principle:

| Principle | Outcome |
|-----------|---------|
| I. Code-First GraphQL | No new entities; existing `RankingSystem` model untouched. **PASS**. |
| II. Translation Discipline | No i18n touched. **PASS**. |
| III. Transactional Mutations | Existing `RankingSystem` mutations remain transactional and authorization-checked. The new `invalidate()` call is placed inside the try block, *after* `commit()` — preserving the rollback-on-error guarantee. **PASS**. |
| IV. Resolver Test Discipline | Test plan (research R6 + tasks file to be generated by `/speckit.tasks`) mandates `Test.createTestingModule`, mocked `Sequelize`, mocked service, no real DB, `afterEach(jest.restoreAllMocks)`. **PASS**. |
| V. Legacy Frontend Boundary | Backend-only. **PASS**. |

Cache invariants from `data-model.md` (in-flight de-duplication, no negative caching for `getById`, instance immutability) are documented in the contract and will be enforced in `RankingSystemService` unit tests.

No new violations introduced. **Complexity Tracking** remains empty.
