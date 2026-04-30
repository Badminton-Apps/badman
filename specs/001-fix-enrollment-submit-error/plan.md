# Implementation Plan: Reliable Enrollment Submission Errors (BAD-21)

**Branch**: `001-fix-enrollment-submit-error` | **Date**: 2026-04-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-fix-enrollment-submit-error/spec.md`

## Summary

Re-classify the failures of the existing single-item enrollment-submit mutation (`EnrollmentResolver.createEnrollment(teamId, subEventId)` in `libs/backend/graphql/src/resolvers/event/competition/enrollment.resolver.ts`) so each documented failure surfaces with a stable `extensions.code` (`PERMISSION_DENIED`, `TEAM_NOT_FOUND`, `SUB_EVENT_NOT_FOUND`, `SEASON_MISMATCH`, fallback `INTERNAL_ERROR`), make a re-submit of an already-enrolled `(team, sub-event)` pair idempotent (success with `alreadyExisted: true` flag), and replace the boolean return with a structured `EnrollmentResult` `@ObjectType` echoing `teamId`, `subEventCompetitionId`, and the created-vs-existed flag. Authorization expands to also accept a club-scoped enrollment permission for users submitting on behalf of teams in their own club. Concurrency for FR-005 is enforced at the application layer via the existing `Team @HasOne EventEntry` invariant plus a new short-circuit (`team.entry?.subEventId === requested subEventId`) inside the transaction; **no DB unique constraint is added** (verified absent in [research.md §R2](./research.md)). The design accepts a documented narrow window where two truly simultaneous submits could both pass the read-back check before either commits; tightening this to a hard guarantee is deferred and tracked in [docs/tech-debt.md](../../docs/tech-debt.md). Logging adds structured fields (`teamId`, `subEventCompetitionId`, user UUID, error code) at `warn` for classified rejections and `error` for `INTERNAL_ERROR`.

## Technical Context

**Language/Version**: TypeScript 5 / Node 20 (NestJS)
**Primary Dependencies**: `@nestjs/graphql` (Apollo, code-first), `@nestjs/common`, `sequelize`, `sequelize-typescript`, `@badman/backend-database`, `@badman/backend-authorization`; `GraphQLError` (from `graphql`) for `extensions.code` classification
**Storage**: PostgreSQL via Sequelize (`event` schema — `EventEntry`, `EventCompetition`, `SubEventCompetition`, `Team`)
**Testing**: Jest, run via `nx test backend-graphql` (or `npx jest --config libs/backend/graphql/jest.config.ts`); resolver unit tests with mocked `Sequelize.transaction` and `jest.spyOn` model statics per the reference pattern
**Target Platform**: Linux server (NestJS on Fastify, port 5010)
**Project Type**: Backend service inside the existing Nx monorepo (`libs/backend/graphql`)
**Performance Goals**: No new targets; preserve current single-mutation latency. Idempotent path MUST short-circuit on uniqueness check without doing additional unnecessary writes.
**Constraints**: All writes inside a single Sequelize transaction (Constitution III). Authorization checked in resolver via `user.hasAnyPermission([...])`. No edits to `all.json` (errors carry codes; FE in separate repo translates). No edits to `apps/badman/` or `libs/frontend/` (Constitution V). Existing `EventEntry` unique constraint over `(teamId, subEventCompetitionId)` is the source of truth for idempotency — to be verified during research, not assumed.
**Scale/Scope**: Single resolver method + 1 new `@ObjectType` (`EnrollmentResult`) + ~7 resolver unit tests + structured log statement additions. No migrations expected.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Compliance | Notes |
|-----------|-----------|-------|
| I. Code-First GraphQL via Sequelize Models | PASS | New `EnrollmentResult` is authored as a `@ObjectType` co-located with the resolver. No SDL, no duplicate DTOs. Existing entities (`Team`, `EventEntry`, `SubEventCompetition`, `EventCompetition`) are unchanged Sequelize models. |
| II. Translation Discipline | PASS / N/A | No `all.json` changes. Server-side English fallback strings on error responses are not user-facing copy — the contract is the stable `extensions.code`; the FE repo translates. |
| III. Transactional Mutations | PASS | Mutation continues to run inside a single `Sequelize.transaction()`; commit on success, rollback on any thrown error. Authorization checked via `user.hasAnyPermission([...])` BEFORE any write. Slug-or-UUID branching N/A (lookups are by UUID only). |
| IV. Resolver Test Discipline | PASS | Tests follow the `enrollmentSetting.resolver.spec.ts` reference pattern. Required cases (mutation-rejects-unauthorized, mutation-handles-not-found, mutation-success-with-commit, mutation-rolls-back-on-error) covered, plus feature-specific cases (season mismatch → typed error, idempotent re-submit → success, club-scope permission accepted). |
| V. Legacy Frontend Boundary | PASS | No edits to `apps/badman/` or `libs/frontend/`. The active FE repo will map error codes separately. |

**Gate result**: PASS. No `Complexity Tracking` entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/001-fix-enrollment-submit-error/
├── plan.md                           # This file
├── spec.md                           # Feature specification
├── research.md                       # Phase 0 output
├── data-model.md                     # Phase 1 output
├── quickstart.md                     # Phase 1 output
├── contracts/
│   └── createEnrollment.graphql.md   # GraphQL contract for the mutation
└── checklists/
    └── requirements.md               # Spec quality checklist
```

### Source Code (repository root — files touched by this feature)

```text
libs/backend/graphql/src/resolvers/event/competition/
├── ennrollment.resolver.ts           # MODIFY — return EnrollmentResult, classify errors with extensions.code, idempotent on unique-constraint, expand permission check, structured logging
├── ennrollment.resolver.spec.ts      # MODIFY (or create) — add cases for season mismatch, idempotent re-submit, club-scope permission
└── enrollment-result.object.ts       # NEW — @ObjectType class for the structured success payload
```

**Structure Decision**: Single Nx lib edit inside `libs/backend/graphql`. No new lib, no new module, no new public API surface beyond extending the existing `createEnrollment` mutation's return type and error contract. The new `@ObjectType` lives next to the resolver that returns it, consistent with the resolver-domain folder convention. No migration, no `all.json` change, no FE work in this repo.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none)    | —          | —                                    |
