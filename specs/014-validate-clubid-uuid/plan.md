# Implementation Plan: Validate `clubId` as UUID at mutation boundary

**Branch**: `014-validate-clubid-uuid` | **Date**: 2026-05-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/014-validate-clubid-uuid/spec.md`

## Summary

Reject non-UUID `clubId` (and `id` on Club-targeted mutations) at the resolver boundary for every Club-scoped GraphQL mutation, before transaction open / advisory lock / permission check / DB query. Surface as `GraphQLError { extensions.code: "BAD_USER_INPUT" }`. Centralize via a single `assertUUID(value, field, ctx)` helper next to the existing `ErrorCode` registry. Read-side `club(id)` keeps UUID-or-slug dual-resolution unchanged. Triggered by the observed Postgres log `invalid input syntax for type uuid: "smash-for-fun" at character 288` and the latent advisory-lock correctness risk in `recalculateTeamNumbersForGroup` (lock key `hashtextextended('teams_renumber:' || clubId || ':' || season || ':' || scopeKey, 0)` must be keyed on the canonical UUID).

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 22 (per `apps/api` runtime).
**Primary Dependencies**: NestJS (Fastify), `@nestjs/graphql` (Apollo, code-first), Sequelize via `sequelize-typescript`, `graphql` (for `GraphQLError`), `uuid` (already a transitive dep — `validate as isUUID`).
**Storage**: PostgreSQL via Sequelize. No schema changes.
**Testing**: Jest per-lib; resolver unit tests follow the reference pattern (`enrollmentSetting.resolver.spec.ts`). One existing integration test (`team-renumbering.integration.spec.ts`, opt-in via `RUN_INTEGRATION_TESTS=1`) stays green unchanged.
**Target Platform**: `apps/api` (Fastify on port 5010). No worker or migration impact.
**Project Type**: Nx monorepo; backend-only change scoped to `libs/backend/graphql`.
**Performance Goals**: N/A. The new validation adds one `isUUID()` call per mutation invocation (negligible, μs).
**Constraints**: MUST NOT regress any UUID-path behavior. MUST run before authorization (no info-leak risk: a non-UUID can never satisfy a `${clubId}_edit:club` scope). MUST NOT modify the read-side `club(id: ...)` query.
**Scale/Scope**: 9 mutation entry points in `libs/backend/graphql/src/resolvers/`. One new utility file. One `ErrorCode` registry addition. One contract doc + one frontend-impact doc update for feature 008.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Code-First GraphQL via Sequelize Models | **PASS (no diff)** | No new entities; no SDL hand-writing. |
| II. Translation Discipline | **PASS (no diff)** | No i18n changes. The `BAD_USER_INPUT` error message is server-side, debug-facing, not user-rendered copy — surfaced to developers via GraphQL `errors[].extensions.code`. |
| III. Transactional Mutations | **PASS — strengthens** | Constitution already requires `IsUUID(id)` branching for slug-or-UUID lookups. This feature applies the *write-side* corollary: mutations that have no slug semantics MUST reject non-UUID input fast. Authorization-after-validation ordering preserved (we validate before, which the constitution permits — auth is required *before any write*, and we still meet that). No new idempotency keys introduced. |
| IV. Resolver Test Discipline | **PASS** | Each touched resolver gets one new spec case using the existing reference pattern (mocked `Sequelize.transaction`, assert `.toHaveBeenCalledTimes(0)` on the bad-input path). No real DB. |
| V. Legacy Frontend Boundary | **PASS (no diff)** | No `apps/badman/` or `libs/frontend/` changes. Spec explicitly assumes the legacy SPA is offline. |

**Result**: All gates pass. No entries in Complexity Tracking.

**Re-check after Phase 1**: still PASS — Phase 1 only adds a helper file and per-resolver call sites; no architectural decisions that touch principles.

## Project Structure

### Documentation (this feature)

```text
specs/014-validate-clubid-uuid/
├── plan.md              # this file
├── spec.md              # already written
├── research.md          # Phase 0 — design decisions (see below)
├── quickstart.md        # Phase 1 — manual repro + verification walk
├── contracts/
│   ├── assert-uuid-helper.md           # contract for the shared validator
│   └── club-mutation-input-policy.md   # the cross-resolver input-shape contract
└── checklists/
    └── requirements.md  # already written, all items pass
```

No `data-model.md` — this feature introduces no entities and changes no Sequelize models. The constitution requires `data-model.md` only when entities are involved.

### Source Code (repository root)

```text
libs/backend/graphql/src/
├── utils/
│   ├── assert-uuid.ts                                      # NEW — the helper
│   ├── error-codes.ts                                      # +1 enum entry: BAD_USER_INPUT
│   └── index.ts                                            # re-export assertUUID
└── resolvers/
    ├── club/
    │   ├── club.resolver.ts                                # 3 sites: removeClub, updateClub, addPlayerToClub
    │   └── club.resolver.spec.ts                           # +3 spec cases (create file if absent)
    ├── team/
    │   ├── team.resolver.ts                                # 2 sites: createTeam, createTeams
    │   ├── team.resolver.spec.ts                           # +2 spec cases
    │   ├── team-renumber.resolver.ts                       # 1 site: recalculateTeamNumbersForGroup
    │   └── team-renumber.resolver.spec.ts                  # +1 spec case
    ├── location/
    │   ├── location.resolver.ts                            # 1 site: addLocation (uses newLocationData.clubId)
    │   └── location.resolver.spec.ts                       # +1 spec case (create file if absent)
    ├── event/
    │   ├── entry.resolver.ts                               # 2 sites (both clubId-bearing mutations)
    │   ├── entry.resolver.spec.ts                          # +2 spec cases (create file if absent)
    │   └── competition/
    │       └── submit-enrollment.service.ts                # called by a resolver; validate at the resolver boundary, not here

specs/008-reorder-teams-atomic/
├── contracts/team-renumber-mutation.md                     # +1 failure row + step-1 prepend
└── frontend-impact.md                                      # +1 "Required client behavior" bullet
```

**Structure Decision**: Nx monorepo, single-lib change. All edits live in `libs/backend/graphql/src/`. No new lib, no new module, no new migration. The `submit-enrollment.service.ts` callsite is validated at its caller's resolver to keep `BAD_USER_INPUT` raised uniformly at the GraphQL layer (services should not throw `GraphQLError`).

## Complexity Tracking

No constitution violations to justify. Table omitted intentionally.
