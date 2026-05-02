# Implementation Plan: finishEventEntry Hardening

**Branch**: `007-finish-event-entry-hardening` | **Date**: 2026-05-02 | **Spec**: [spec.md](spec.md)
**Input**: [spec.md](spec.md)

## Summary

Wrap `EventEntryResolver.finishEventEntry` writes in a single Sequelize transaction; add an idempotency precheck so re-submission never sends a duplicate notification or writes a duplicate audit-log row; replace the `Boolean!` return with a `FinishEventEntryResult!` object exposing `success` / `alreadyFinalised` / `notificationDispatched`; reject zero-team finalisation with `GraphQLError` code `NO_TEAMS_TO_FINALISE`; dispatch the notification AFTER commit so its failure cannot roll back the database; ship a co-located `entry.resolver.spec.ts` matching the project's resolver test convention.

## Technical Context

**Language/Version**: TypeScript 5.x on Node 20 (Nx monorepo)
**Primary Dependencies**: NestJS, Apollo (`@nestjs/graphql`, code-first), Sequelize + `sequelize-typescript`, `nestjs-i18n`, Bull (Redis); `@badman/backend-database`, `@badman/backend-graphql`, `@badman/backend-notifications`, `@badman/backend-authorization`
**Storage**: PostgreSQL via Sequelize. Tables touched: `Clubs.contactCompetition`, `event.EventEntries.sendOn`, `system.Loggings`. No schema migration.
**Testing**: Jest. Co-located `entry.resolver.spec.ts`; `Test.createTestingModule` + mocked `Sequelize`, `jest.spyOn` on model statics, mocked `NotificationService`. Run via `nx test backend-graphql`.
**Target Platform**: Linux server, NestJS on Fastify, port 5010.
**Project Type**: Backend mutation hardening inside an existing Nx monorepo. No new app or lib.
**Performance Goals**: Resolver completes within current latency envelope. Spec suite under 5 s locally.
**Constraints**: Notification dispatch MUST occur after commit — must not extend transaction lifetime over a network call. Schema return-type change is breaking; coordinated with sibling frontend repo's release.
**Scale/Scope**: Single resolver method; one new `@ObjectType` (`FinishEventEntryResult`); one new `ErrorCode` constant; one new spec file.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Compliance |
|-----------|-----------|
| **I. Code-First GraphQL via Sequelize Models** | PASS. `FinishEventEntryResult` is a non-persistent `@ObjectType` for a mutation result — same pattern as `TeamResult` / `EnrollmentResult`. No new persistent entity, no SDL, no DTO duplication. |
| **II. Translation Discipline** | N/A. No `all.json` strings touched. Error code strings are machine-readable identifiers, not user copy. |
| **III. Transactional Mutations** | PASS — this feature exists to bring the resolver into compliance. Writes wrapped in a single Sequelize transaction; auth checked before any write; commit/rollback boundaries explicit. The idempotency clause of Principle III formally applies to *create* mutations with natural uniqueness keys; we apply the same shape here (`alreadyFinalised: boolean`) by analogy because finalisation has a natural uniqueness key `(clubId, season)`. Documented in research.md. |
| **IV. Resolver Test Discipline** | PASS — adds the missing co-located spec to `entry.resolver.ts`. Matches the reference pattern in `enrollmentSetting.resolver.spec.ts`. |
| **V. Legacy Frontend Boundary** | PASS. No changes under `apps/badman/` or `libs/frontend/`. Schema break forces a generated-types regen for the legacy SPA only — a tooling artefact regen, not feature work. |

No violations. **Complexity Tracking** section omitted.

## Project Structure

### Documentation (this feature)

```text
specs/007-finish-event-entry-hardening/
├── plan.md                     # this file
├── spec.md
├── spec.original.md            # pre-compression backup
├── research.md                 # Phase 0
├── data-model.md               # Phase 1
├── quickstart.md               # Phase 1
├── contracts/
│   └── finish-event-entry.graphql
├── checklists/
│   └── requirements.md
└── tasks.md                    # produced later by /speckit-tasks
```

### Source Code (repository root)

Only existing locations are touched:

```text
libs/backend/graphql/src/
├── resolvers/event/
│   ├── entry.resolver.ts                       # MODIFY
│   ├── entry.resolver.spec.ts                  # CREATE
│   └── finish-event-entry-result.object.ts     # CREATE
└── utils/
    └── error-codes.ts                          # MODIFY: add NO_TEAMS_TO_FINALISE
```

No changes outside `libs/backend/graphql/`. No DB migration. No worker code. No translation files.

**Structure Decision**: Single-project, in-place modification of `libs/backend/graphql`. The mutation, its contract, its test, and its result object all live next to one another so a reviewer reads the change as one cohesive unit. The new error code joins the existing shared registry.

## Phase 0 — Research

See [research.md](research.md). All NEEDS CLARIFICATION items resolved:

1. **Concurrency / row-locking**: deferred from spec to plan — resolved with `SELECT ... FOR UPDATE` on the affected `EventEntry` rows inside the transaction.
2. **Notification post-commit ordering**: resolved — notification awaited after `transaction.commit()` returns; failure caught and surfaced as `notificationDispatched: false`, never rolls back DB.
3. **Idempotency precheck location**: resolved — performed inside the transaction immediately after the row-lock acquire, before any writes.
4. **Audit-log content on idempotent path**: resolved — no `Logging` row written when `alreadyFinalised: true`. Email-only update on the no-op path is silent at the DB layer.

## Phase 1 — Design & Contracts

### Data model

See [data-model.md](data-model.md). No new persistent entities. One new transient `@ObjectType` (`FinishEventEntryResult`).

### Contracts

See [contracts/finish-event-entry.graphql](contracts/finish-event-entry.graphql). Captures the new mutation signature, return type fields, and the per-code `extensions` payload for `NO_TEAMS_TO_FINALISE`, `PERMISSION_DENIED`, `CLUB_NOT_FOUND`. Sibling frontend repo will codegen against this.

### Quickstart

See [quickstart.md](quickstart.md). Developer-facing checklist for verifying the change locally.

### Frontend migration notes

See [frontend-changes.md](frontend-changes.md) — exhaustive checklist of frontend-visible changes (return-type swap, three terminal outcomes, idempotency, email side-effect on no-op path, new error code, notification-failure semantics, schema diff, coordinated rollout). Hand this to the frontend repo as the implementation brief for BAD-122 follow-up.

### Agent context update

`CLAUDE.md` plan-reference block updated to point at this plan file. (Symlink → `AGENTS.md`.)

## Re-evaluated Constitution Check (post-design)

Same five principles, same outcome — all PASS. Design did not introduce new abstractions, new persistence, or translation work.
