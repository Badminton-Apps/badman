# Implementation Plan: Adopt DataLoader for GraphQL N+1 batching

**Branch**: `019-graphql-dataloader` | **Date**: 2026-05-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/019-graphql-dataloader/spec.md`

## Summary

Replace the bespoke microtask-debounced batcher inside [`TeamAssociationService`](libs/backend/graphql/src/resolvers/team/team-association.service.ts) with the industry-standard [`dataloader`](https://github.com/graphql/dataloader) package. Public API and request-scoped lifecycle stay identical; only the file's internals change. No resolver call-site changes, no Apollo context plumbing, no new request-scoped providers. Eight future opt-in sites are catalogued in the spec under "Future Opt-In Candidates" but are explicitly out of scope here.

## Technical Context

**Language/Version**: TypeScript 5.8 (per root `package.json`).
**Primary Dependencies**: NestJS 11 (`@nestjs/common`, `@nestjs/graphql@^13.0.0`, `@nestjs/apollo@^13.0.0`), Sequelize 6 via `sequelize-typescript`, Apollo Server 4 (driven by `@nestjs/apollo`). New runtime dep: `dataloader@^2.x` (single-purpose, zero transitive deps).
**Storage**: PostgreSQL via Sequelize (unchanged).
**Testing**: Jest, `nx test backend-graphql`. Spec file [`team-association.service.spec.ts`](libs/backend/graphql/src/resolvers/team/team-association.service.spec.ts) already covers the seven critical behaviours (batching, dedup, group-by-team, drawId fallback, membership attachment).
**Target Platform**: Node 20 backend runtime (NestJS API + workers).
**Project Type**: Web service (single Nx monorepo, backend libs under `libs/backend/`).
**Performance Goals**: Match PR #920 baseline — exactly five DB queries for `GetClubTeams` asking the five batched associations on a ≥10-team club. Memory: per-request DataLoader cache discarded at request end (no growth).
**Constraints**: Zero new lint warnings, zero new test failures, zero schema changes, zero call-site changes outside `team-association.service.ts`.
**Scale/Scope**: One service file rewritten (~170 lines → ≤130 target). One npm dependency added.

## Constitution Check

*GATE: must pass before Phase 0; re-checked after Phase 1.*

| Principle | Verdict | Notes |
|-----------|---------|-------|
| I. Code-First GraphQL via Sequelize Models | ✅ N/A | No model or schema changes. No new `@ObjectType`. |
| II. Translation Discipline | ✅ N/A | No i18n changes. |
| III. Transactional Mutations | ✅ N/A | No mutations touched. |
| IV. Resolver Test Discipline | ✅ PASS | `team-association.service.spec.ts` follows the reference pattern: jest spies on model statics, no real DB, isolated via `jest.restoreAllMocks()`. The refactor keeps all existing assertions; if anything, DataLoader's stricter contract (input order/length parity) makes the tests *more* meaningful. |
| V. Legacy Frontend Boundary | ✅ N/A | Backend-only refactor. |

No violations. No entries needed in **Complexity Tracking**.

Re-check after Phase 1: still PASS — the design phase produces no new public APIs, no new GraphQL schema, and no migrations.

## Project Structure

### Documentation (this feature)

```text
specs/019-graphql-dataloader/
├── plan.md              # This file
├── spec.md              # Feature spec
├── research.md          # Phase 0 — dataloader semantics + integration choices
├── data-model.md        # Phase 1 — internal type model for the rewritten service
├── quickstart.md        # Phase 1 — local validation steps
├── contracts/
│   └── team-association.service.contract.md   # Public API contract (unchanged)
└── checklists/
    └── requirements.md  # From /speckit.specify
```

### Source Code (repository root)

```text
libs/backend/graphql/src/resolvers/team/
├── team-association.service.ts          # <- rewritten (this PR)
├── team-association.service.spec.ts     # <- assertions preserved; minor mock shape tweaks only
├── team.module.ts                       # untouched
├── team.resolver.ts                     # untouched (consumes service via unchanged public API)
└── team.resolver.spec.ts                # untouched (already stubs the service)

libs/backend/graphql/src/resolvers/
└── (all other resolver files — untouched in this PR)

package.json                              # <- + `"dataloader": "^2.2.3"` in dependencies
```

**Structure Decision**: backend Nx workspace, single-lib touch. `libs/backend/graphql/src/resolvers/team/` is the only resolver directory modified. The change is internal — no module re-wiring, no DI graph changes, no exports added or removed from the team module.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified.

(Empty — no violations.)
