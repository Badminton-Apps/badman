# Implementation Plan: Reliable Team Creation Errors

**Branch**: `002-team-resolver-improvements` | **Date**: 2026-04-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-team-resolver-improvements/spec.md`

## Summary

Re-classify the failures of the existing `TeamsResolver.createTeam(data, nationalCountsAsMixed)` mutation in [`libs/backend/graphql/src/resolvers/team/team.resolver.ts:177`](../../libs/backend/graphql/src/resolvers/team/team.resolver.ts#L177) so each documented failure surfaces with a stable `extensions.code` (`PERMISSION_DENIED`, `CLUB_NOT_FOUND`, `PLAYER_NOT_FOUND`, `RANKING_NOT_FOUND`, fallback `INTERNAL_ERROR`); make the mutation strictly **create-or-noop** (idempotent) on the cross-season link key — when an existing team is found for `(link, season)`, return success with `alreadyExisted: true` and perform NO writes (the previous upsert-on-find behavior that mutated team fields, roster, and entry is REMOVED — updates go through the existing `updateTeam` mutation); replace the `Team` return with a structured `TeamResult` `@ObjectType` echoing `teamId`, `clubId`, and the created-vs-existed flag (breaking GraphQL schema change). Authorization remains the existing `[${dbClub.id}_edit:club, edit-any:club]` check — no expansion is required (the club-scoped permission already covers the use case enrollment had to extend for). Concurrency for FR-006 is enforced at the application layer via the existing find-then-create flow inside the transaction; **no DB unique constraint is added** (verified: no unique index on `(link, season)`; the legacy `teams_unique_constraint` on `(clubId, teamNumber, type)` was dropped in `20230520140833-removing teams constraint.js`). The pathological simultaneous-create window is documented and tightening to a DB-enforced guarantee is deferred to tech-debt, mirroring BAD-21. The auto-incremented `teamNumber` race is explicitly out of scope (pre-existing behavior preserved). Logging adds structured fields (`teamId`, `clubId`, user UUID, error code) at `warn` for classified rejections and `error` for `INTERNAL_ERROR`. Frontend follow-up to migrate all `createTeam` call sites is tracked in [Linear BAD-128](https://linear.app/dashdot/issue/BAD-128).

## Technical Context

**Language/Version**: TypeScript 5 / Node 20 (NestJS)
**Primary Dependencies**: `@nestjs/graphql` (Apollo, code-first), `@nestjs/common`, `sequelize`, `sequelize-typescript`, `@badman/backend-database`, `@badman/backend-authorization`; `GraphQLError` (from `graphql`) for `extensions.code` classification
**Storage**: PostgreSQL via Sequelize (`public` schema for `Team`, `TeamPlayerMembership`, `Player`, `Club`; `event` schema for `EventEntry`, `SubEventCompetition`; `ranking` schema for `RankingLastPlace`, `RankingSystem`)
**Testing**: Jest, run via `nx test backend-graphql` (or `npx jest --config libs/backend/graphql/jest.config.ts`); resolver unit tests with mocked `Sequelize.transaction` and `jest.spyOn` model statics per the reference pattern (`enrollmentSetting.resolver.spec.ts`)
**Target Platform**: Linux server (NestJS on Fastify, port 5010)
**Project Type**: Backend service inside the existing Nx monorepo (`libs/backend/graphql`)
**Performance Goals**: No new targets; preserve current single-mutation latency. Idempotent path MUST short-circuit on the find by `(link, season)` without performing any writes.
**Constraints**: All writes inside a single Sequelize transaction (Constitution III). Authorization checked in resolver via `user.hasAnyPermission([...])`. No edits to `all.json` (errors carry codes; FE in separate repo translates). No edits to `apps/badman/` or `libs/frontend/` (Constitution V). No new DB constraints in this change (idempotency is application-level; tech-debt entry covers the deferred DB unique index).
**Scale/Scope**: Single resolver method (`createTeam`) + 1 new `@ObjectType` (`TeamResult`) + ~10 resolver unit tests + structured log statement additions. The `createTeams` batch mutation that delegates to `createTeam` in a loop continues to work (it returns `Team[]` today and will return `TeamResult[]` after — also part of the breaking schema change covered by BAD-128). No migrations.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Compliance | Notes |
|-----------|-----------|-------|
| I. Code-First GraphQL via Sequelize Models | PASS | New `TeamResult` is authored as a `@ObjectType` co-located with the resolver. No SDL, no duplicate DTOs. Existing entities (`Team`, `Club`, `Player`, `EventEntry`, etc.) are unchanged Sequelize models. |
| II. Translation Discipline | PASS / N/A | No `all.json` changes. Server-side English fallback strings on error responses are not user-facing copy — the contract is the stable `extensions.code`; the FE repo translates. |
| III. Transactional Mutations | PASS | Mutation continues to run inside a single `Sequelize.transaction()`; commit on success, rollback on any thrown error. Authorization checked via `user.hasAnyPermission([...])` BEFORE any write. Slug-or-UUID branching N/A (lookups are by UUID only). |
| IV. Resolver Test Discipline | PASS | Tests follow the `enrollmentSetting.resolver.spec.ts` reference pattern. Required cases (mutation-rejects-unauthorized, mutation-handles-not-found, mutation-success-with-commit, mutation-rolls-back-on-error) covered, plus feature-specific cases (player-not-found → typed error, idempotent re-submit → success no-op, ranking-not-found, breaking return shape). |
| V. Legacy Frontend Boundary | PASS | No edits to `apps/badman/` or `libs/frontend/`. The active FE repo will migrate all `createTeam` call sites separately (tracked in BAD-128). |

**Gate result**: PASS. No `Complexity Tracking` entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/002-team-resolver-improvements/
├── plan.md                         # This file
├── spec.md                         # Feature specification
├── research.md                     # Phase 0 output
├── data-model.md                   # Phase 1 output
├── quickstart.md                   # Phase 1 output
├── contracts/
│   └── createTeam.graphql.md       # GraphQL contract for the mutation
└── checklists/
    └── requirements.md             # Spec quality checklist
```

### Source Code (repository root — files touched by this feature)

```text
libs/backend/graphql/src/resolvers/team/
├── team.resolver.ts                # MODIFY — return TeamResult, classify errors with extensions.code, strict create-or-noop on (link, season), structured logging. Remove upsert-on-find behavior. Update createTeams batch return type.
├── team.resolver.spec.ts           # MODIFY (or create) — add cases for permission denied, club not found, player not found, ranking not found, idempotent re-submit (no-op), success with alreadyExisted flag, INTERNAL_ERROR rollback
└── team-result.object.ts           # NEW — @ObjectType class for the structured success payload
```

**Structure Decision**: Single Nx lib edit inside `libs/backend/graphql`. No new lib, no new module, no new public API surface beyond extending the existing `createTeam` mutation's return type and error contract. The new `@ObjectType` lives next to the resolver that returns it, consistent with the resolver-domain folder convention. No migration, no `all.json` change, no FE work in this repo.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none)    | —          | —                                    |
