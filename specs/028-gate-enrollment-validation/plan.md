# Implementation Plan: Gate Enrollment Validation Field

**Branch**: `028-gate-enrollment-validation` | **Date**: 2026-05-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/028-gate-enrollment-validation/spec.md`

## Summary

Make the `EventEntry.enrollmentValidation` GraphQL field opt-in via a `validate: Boolean = false` argument. When omitted or `false`, the resolver returns `null` immediately and does not invoke `EnrollmentValidationCacheService`. The wizard (active frontend, separate repo) opts in by passing `validate: true`. A runtime kill-switch (env var) lets the platform team temporarily flip the default back to "always compute" if the frontend rollout slips, per spec FR-010. Slow-log lines from `IndexCalculationService` gain a `caller` tag per spec FR-008.

This removes the per-request club-wide validation that floods the API process at night when the sync worker saturates the shared Postgres instance.

## Technical Context

**Language/Version**: TypeScript (Node.js 20+, per repo baseline)
**Primary Dependencies**: NestJS, Apollo (`@nestjs/graphql`, code-first), Sequelize, Bull. No new dependencies.
**Storage**: PostgreSQL (Sequelize). No schema change; no migration.
**Testing**: Jest, per `libs/backend/graphql/jest.config.ts` and `libs/backend/competition/enrollment/jest.config.ts`. Follow resolver-test convention from [enrollmentSetting.resolver.spec.ts](../../libs/backend/graphql/src/resolvers/enrollmentSetting/enrollmentSetting.resolver.spec.ts).
**Target Platform**: API process (NestJS on Fastify, port 5010). No worker-process changes.
**Project Type**: Nx monorepo, backend libraries imported as `@badman/<name>`.
**Performance Goals**: Eliminate `Slow index calculation` WARNs from non-enrollment-wizard traffic (spec SC-002: ≥95% drop). Eliminate health-check timeout events during nightly sync window (spec SC-001: zero events over 14 nights).
**Constraints**: Database health-check timeout fixed at 1 s (environmental). Schema is code-first via Sequelize/`@nestjs/graphql`; field cannot be removed or renamed (spec FR-005).
**Scale/Scope**: Two GraphQL resolver edits, one service-method-signature extension (`caller?: string`), ~6 call-site updates to pass the caller tag, one env-var read for the kill-switch, plus tests. No data migration. No external API change beyond the new optional GraphQL arg.

## Constitution Check

| Principle | Applies? | Status |
|---|---|---|
| I. Code-First GraphQL via Sequelize Models | No new entity introduced. Existing `EventEntry` model and `TeamEnrollmentOutput` `@ObjectType` reused as-is. | PASS |
| II. Translation Discipline (NON-NEGOTIABLE) | No `all.json` changes. No user-facing copy added. | N/A |
| III. Transactional Mutations | Not a mutation. Field is a read-side `@ResolveField`. No idempotency contract involved. | N/A |
| IV. Resolver Test Discipline | New tests follow the reference pattern from `enrollmentSetting.resolver.spec.ts`: `Test.createTestingModule`, mocked `EnrollmentValidationCacheService`, `afterEach(jest.restoreAllMocks)`. CRUD cases not applicable (read-side resolve-field), so coverage targets: gate-off returns `null` and does not call cache; gate-on delegates to cache; cache failure surfaces (spec FR-006). | PASS |
| V. Legacy Frontend Boundary (NON-NEGOTIABLE) | No work in `apps/badman/` or `libs/frontend/`. Frontend opt-in lives in the separate active-frontend repo and is out of scope. | PASS |

**Gate**: PASS. No violations. `Complexity Tracking` section omitted (nothing to justify).

## Project Structure

### Documentation (this feature)

```text
specs/028-gate-enrollment-validation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (minimal — no schema change)
├── contracts/
│   └── graphql-schema-delta.md   # GraphQL schema change (added arg)
├── quickstart.md        # Phase 1 output (local verification)
├── checklists/
│   └── requirements.md  # Created by /speckit.specify
└── tasks.md             # /speckit.tasks output (not created here)
```

### Source Code (repository root)

Existing Nx monorepo. Touched paths only:

```text
libs/backend/graphql/src/resolvers/event/
├── entry.resolver.ts                          # ADD `validate` arg + gate
├── entry.resolver.spec.ts                     # ADD tests for gate
└── enrollment-validation-cache.service.ts     # UNCHANGED (already DataLoader-cached per request)

libs/backend/competition/enrollment/src/services/
├── index-calculation/
│   ├── index-calculation.service.ts           # ADD optional `caller` in options; include in slow/normal log
│   └── index-calculation.service.spec.ts      # ADD assertion that caller tag appears in WARN message
└── validate/
    └── enrollment.service.ts                  # Pass `caller: "EnrollmentValidationService.fetchAndValidate"`

libs/backend/graphql/src/resolvers/team/team.resolver.ts          # Pass caller `"TeamsResolver.updateTeam"` / `"TeamsResolver.createTeams"`
libs/backend/graphql/src/resolvers/event/competition/enrollment-entry.service.ts  # Pass caller `"EnrollmentEntryService.createEntry"`
libs/backend/graphql/src/resolvers/event/competition/calculate-index/calculate-index.resolver.ts  # Pass caller `"CalculateIndexResolver.calculateIndex"`
libs/backend/database/src/models/event/entry.model.ts             # Pass caller `"EventEntry.recalculateCompetitionIndex"` from hook

libs/utils/src/lib/config/                    # Add `ENROLLMENT_VALIDATION_DEFAULT_ENABLED` (default: false) to config schema
apps/api/src/app/app.module.ts                # No edit unless ConfigService is not already wired here (it is)
```

**Structure Decision**: Single-project edit pattern. No new lib, no new module. The `EventEntry.enrollmentValidation` resolver lives at `libs/backend/graphql/src/resolvers/event/entry.resolver.ts:86-95`; the cache service it delegates to is request-scoped and stays request-scoped. The sibling `EnrollmentResolver.enrollmentValidation` at `libs/backend/graphql/src/resolvers/event/competition/enrollment.resolver.ts:28` is a **top-level `@Query` already requiring an explicit `EnrollmentInput` argument**, so it is already opt-in by construction — no gate needed there. Spec FR-003 is satisfied by inspection (verified during planning).

## Phase 0: Research

See [research.md](research.md). Summary:

- **Decision**: Gate via optional GraphQL field arg with server-side default controlled by env var (kill-switch).
- **Rationale**: Smallest blast radius. Field stays in schema; current consumers get `null` until they opt in; platform team can flip default per-environment without redeploy.
- **Alternatives considered**: (1) Cross-request Redis cache — doesn't fix cold-cache stampedes and validation depends on mutable team rosters; (2) Detach into dedicated top-level `clubEnrollmentValidation(clubId, season)` query — cleaner long-term but requires frontend repo schema-shape change; (3) Detect sync activity and skip — requires DB/IPC coupling between api and worker-sync. Field-arg gate captures the intent of all three with one resolver edit.

No NEEDS CLARIFICATION items remained from spec.

## Phase 1: Design

### Contract (GraphQL schema delta)

See [contracts/graphql-schema-delta.md](contracts/graphql-schema-delta.md). Summary:

```graphql
type EventEntry {
  # ... unchanged fields ...
  enrollmentValidation(validate: Boolean = false): TeamEnrollmentOutput
}
```

- Field exists today with no arg. After change: same field, same return type (still `nullable`), one new optional arg with a server-controlled default.
- Backwards-compatible at the SDL level: existing query documents continue to validate.
- Semantic change: previously-implicit "always compute" becomes "do not compute unless asked." Mitigated by the env-var kill-switch.

### Data model

See [data-model.md](data-model.md). No schema change. The only behavioral artifact is the new server-controlled flag:

- `ENROLLMENT_VALIDATION_DEFAULT_ENABLED` (boolean, default `false`).
  - When `false` and the GraphQL caller did not pass `validate`, the resolver returns `null` and skips computation.
  - When `true`, the resolver behaves as it does today (always compute). Used as a temporary kill-switch only.
- Added to the `@badman/utils` config schema so it is validated at API boot.

### Caller-tag log enrichment

`IndexCalculationService.calculate(inputs, options)` adds an optional `options.caller: string`. The two existing log lines:

```ts
this.logger.warn(`Slow index calculation: ${inputs.length} input(s), ${totalPlayers} player ref(s), ${durationMs}ms`);
this.logger.debug(`Index calculation: ${inputs.length} input(s), ${totalPlayers} player ref(s), ${durationMs}ms`);
```

become:

```ts
const tag = options?.caller ? ` [${options.caller}]` : "";
this.logger.warn(`Slow index calculation:${tag} ${inputs.length} input(s), ${totalPlayers} player ref(s), ${durationMs}ms`);
this.logger.debug(`Index calculation:${tag} ${inputs.length} input(s), ${totalPlayers} player ref(s), ${durationMs}ms`);
```

`calculateOne` forwards `options` unchanged. Sentry span attribute `index_calc.caller` set when present.

Each call site passes a stable string:

| File | Caller value |
|---|---|
| [libs/backend/competition/enrollment/src/services/validate/enrollment.service.ts](../../libs/backend/competition/enrollment/src/services/validate/enrollment.service.ts) | `"EnrollmentValidationService.fetchAndValidate"` |
| [libs/backend/graphql/src/resolvers/team/team.resolver.ts](../../libs/backend/graphql/src/resolvers/team/team.resolver.ts) `updateTeam` | `"TeamsResolver.updateTeam"` |
| [libs/backend/graphql/src/resolvers/team/team.resolver.ts](../../libs/backend/graphql/src/resolvers/team/team.resolver.ts) `createTeams` | `"TeamsResolver.createTeams"` |
| [libs/backend/graphql/src/resolvers/event/competition/enrollment-entry.service.ts](../../libs/backend/graphql/src/resolvers/event/competition/enrollment-entry.service.ts) | `"EnrollmentEntryService.createEntry"` |
| [libs/backend/graphql/src/resolvers/event/competition/calculate-index/calculate-index.resolver.ts](../../libs/backend/graphql/src/resolvers/event/competition/calculate-index/calculate-index.resolver.ts) | `"CalculateIndexResolver.calculateIndex"` |
| [libs/backend/database/src/models/event/entry.model.ts](../../libs/backend/database/src/models/event/entry.model.ts) hook | `"EventEntry.recalculateCompetitionIndex"` |

### Resolver gate

[libs/backend/graphql/src/resolvers/event/entry.resolver.ts:86-95](../../libs/backend/graphql/src/resolvers/event/entry.resolver.ts#L86-L95):

```ts
@ResolveField(() => TeamEnrollmentOutput, {
  nullable: true,
  description:
    "Validate the enrollment. Defaults to null. Pass `validate: true` to compute — " +
    "this is a club-wide computation; only request it when you really need it. " +
    "**note**: the levels are the ones from may!",
})
async enrollmentValidation(
  @Parent() eventEntry: EventEntry,
  @Args("validate", { type: () => Boolean, nullable: true, defaultValue: false })
  validate: boolean,
): Promise<TeamEnrollmentOutput | null> {
  const effectiveValidate =
    validate || this.configService.get<boolean>("ENROLLMENT_VALIDATION_DEFAULT_ENABLED") === true;
  if (!effectiveValidate) return null;
  const team = await eventEntry.getTeam();
  return this.enrollmentValidationCache.getForTeam(team);
}
```

Constructor adds `private readonly configService: ConfigService<ConfigType>` (already wired throughout the project — see `app.controller.ts` for the precedent).

### Quickstart

See [quickstart.md](quickstart.md). Local verification:

1. `npm run docker:up`
2. `nx run-many --target=serve --projects=api,worker-sync --parallel`
3. Hit GraphiQL or curl with two requests — one without `validate`, one with `validate: true` — and watch the log stream for the new `[caller]` tag.

### Agent context update

Updated `CLAUDE.md` (via `AGENTS.md` symlink) `SPECKIT` block to reference this plan path.

## Constitution Check (post-design re-evaluation)

Re-checked after Phase 1. No new violations introduced by the design (no models added, no translations touched, no mutation work, tests follow the reference pattern, no legacy-frontend edits). Gate **PASS**.

## Complexity Tracking

Not applicable. No violations to justify.
