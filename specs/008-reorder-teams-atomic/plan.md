# Implementation Plan: Atomic Team Reorder (explicit `recalculateTeamNumbersForGroup`)

**Branch**: `008-reorder-teams-atomic` | **Date**: 2026-05-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-reorder-teams-atomic/spec.md`

## Summary

Numbering of teams within a club's competition group is owned by the backend and recomputed only on demand, by the enrollment wizard. Today the wizard tries to express renumbering as parallel partial `updateTeam` calls; they deadlock on a resolver-level uniqueness check and produce `TEAM_NUMBER_CONFLICT`. This feature replaces that pattern with one explicit GraphQL mutation, `recalculateTeamNumbersForGroup(clubId, season, type, nationalCountsAsMixed)`, which the wizard calls after each save and once per affected scope at the end of bulk operations. The mutation is the ONLY path that writes `teamNumber` / `name` / `abbreviation` going forward; `updateTeam` / `createTeam` / `createTeams` / `deleteTeam` lose every line of code that used to touch those fields. Mid-season callers never invoke the recalculate, so team numbering stays frozen for the rest of the season — even when ranking sync shifts `baseIndex` arithmetically. Concurrency is serialized per scope via `pg_advisory_xact_lock`. Pooling between MX and NATIONAL is preserved per the federation rule (NATIONAL teams take slots `1..K` ordered by `baseIndex`; MX teams take `K+1..K+M` ordered by `baseIndex`) when the caller passes `nationalCountsAsMixed=true`.

## Technical Context

**Language/Version**: TypeScript 5.x on Node 20 (Nx monorepo).
**Primary Dependencies**: NestJS (Fastify adapter), Apollo (`@nestjs/graphql`, code-first), Sequelize 6 + `sequelize-typescript`, `@badman/utils` (`getIndexFromPlayers`).
**Storage**: PostgreSQL (multi-schema: `public` for Teams, Clubs, Players, RankingLastPlace; `ranking` for RankingSystem). No new columns; advisory lock used for serialization.
**Testing**: Jest per-lib (`nx test backend-graphql`). New unit tests follow the resolver-pattern from `enrollmentSetting.resolver.spec.ts`. One integration test exercises true concurrency against a real test DB.
**Target Platform**: NestJS API (port 5010). Workers untouched (federation sync explicitly does not trigger renumber, FR-014).
**Project Type**: web service.
**Performance Goals**: Recalculate < 200 ms p95 for the largest realistic scope (≤50 teams in a pooled MX+NATIONAL set), including the `RankingLastPlace` batch fetch. Wizard "save → recalculate → render" round-trip < 1 s p95 unchanged.
**Constraints**: Per-scope serialization (advisory lock keyed on the pooled set when pooling is in effect, otherwise on the single type). No partial writes visible. No schema migration. No data migration (the legacy `_temp` artifact is confined to local/staging; the new primitive corrects any such row the first time its scope is recalculated). The 002-spec idempotency contract on `createTeam` MUST be preserved. The existing `nationalCountsAsMixed` flag and pooling logic in `createTeam` STAY as-is.
**Scale/Scope**: Production scopes today are O(2–10) teams per single-type group, O(2–20) when pooled. Concurrent wizard calls per scope are O(1–5).

## Constitution Check

Constitution v1.1.0 — gates evaluated against the proposed design:

- **I. Code-First GraphQL via Sequelize Models** — Adds one new GraphQL mutation (`recalculateTeamNumbersForGroup`). The mutation's return type is a small inline `@ObjectType("RecalculateTeamNumbersResult")` carrying `[Team]` (the existing model-as-objecttype) for the affected scope. No new persistent entity; the inline result type follows the same pattern as the existing paged-result objects mentioned in Principle III. ✓
- **II. Translation Discipline (NON-NEGOTIABLE)** — No i18n keys added or moved. The new mutation reuses existing error codes (`PERMISSION_DENIED`, `CLUB_NOT_FOUND`, `INTERNAL_ERROR` from `error-codes.ts`). `TEAM_NUMBER_CONFLICT` becomes unused but is left in the registry for one release; removal tracked as tech-debt. ✓
- **III. Transactional Mutations** — The new mutation acquires its own Sequelize transaction, takes a `pg_advisory_xact_lock` on the scope key, runs the recalculate, commits or rolls back. Authorization is checked via `user.hasAnyPermission([<clubId>_edit:club, edit-any:club])` before any write. Idempotency: when the scope is already correctly numbered, the mutation writes nothing and returns the unchanged set. ✓
- **IV. Resolver Test Discipline** — New resolver / service unit tests use `Test.createTestingModule` + mocked `Sequelize` (transaction stub) + `jest.spyOn(Team, 'findAll' | 'save')` + a fake `Player` for authz. Cases: query-style "already correct → no writes", happy-path renumber writes only changed rows, unauthorized → `UnauthorizedException` (or `PERMISSION_DENIED` GraphQLError) and rollback, club-not-found → not-found GraphQLError and rollback, mid-call DB error → rollback. One integration test runs against a real DB to exercise the advisory lock under 10 parallel calls. ✓
- **V. Legacy Frontend Boundary (NON-NEGOTIABLE)** — No changes under `apps/badman/` or `libs/frontend/`. The active frontend (separate repo) is the FE half of FR-013 and ships in lockstep. ✓

**No violations to justify.** Complexity Tracking section omitted.

## Project Structure

### Documentation (this feature)

```text
specs/008-reorder-teams-atomic/
├── plan.md              # This file
├── spec.md              # Feature spec (with Q1–Q5 clarifications)
├── research.md          # Phase 0 — decisions on scope, baseIndex source, locking, pooling shape, mutation surface
├── data-model.md        # Phase 1 — entity surface (no new tables; the recalculate scope is restated)
├── contracts/
│   ├── team-renumber-mutation.md      # NEW: GraphQL contract for recalculateTeamNumbersForGroup
│   └── team-renumbering-service.md    # Internal service the resolver delegates to
├── frontend-impact.md   # Release note for the active frontend repo
├── quickstart.md        # Phase 1 — local repro of the bug + post-fix verification
├── checklists/
│   └── requirements.md  # Spec-quality checklist
└── tasks.md             # Created by /speckit-tasks (NOT this command)
```

### Source Code (repository root)

```text
libs/backend/graphql/src/resolvers/team/
├── team.resolver.ts                                # MODIFIED: updateTeam drops teamNumber/name/abbreviation writes (deletes the conflict-check + shift block + _temp dance + changedTeams loop). createTeam keeps its existing MAX+1 / nationalCountsAsMixed logic for placeholder numbers (per FR-005). createTeams unchanged. deleteTeam unchanged. NONE of these mutations call the recalculate as a side effect.
├── team.module.ts                                  # MODIFIED: register TeamRenumberingService + TeamRenumberResolver
├── team.resolver.spec.ts                           # MODIFIED: drop teamNumber-input cases; assert teamNumber is not in TeamUpdateInput; add cases proving updateTeam never writes teamNumber/name/abbreviation
├── team-renumber.resolver.ts                       # NEW: hosts @Mutation recalculateTeamNumbersForGroup; thin authz + transaction wrapper around the service
├── team-renumber.resolver.spec.ts                  # NEW: resolver-pattern unit tests
├── team-renumber-result.object.ts                  # NEW: @ObjectType inline result { teams: [Team], affectedScope: { clubId, season, types: [SubEventTypeEnum] } }
├── team-renumbering.service.ts                     # NEW: the recalculate primitive (advisory lock, baseIndex compute, sort, write)
├── team-renumbering.service.spec.ts                # NEW: unit tests (mocked Sequelize + Team.findAll + RankingLastPlace.findAll + RankingSystem.findOne)
└── team-renumbering.integration.spec.ts            # NEW: real-DB concurrency test (10 parallel recalculate calls against the same scope; pooled MX+NATIONAL exercises the pooling lock key)

libs/backend/database/src/models/
└── team.model.ts                                   # UNCHANGED: BeforeUpdate hook continues to regenerate name/abbreviation on teamNumber change. The hook is what makes the recalculate's bulk save produce correct names.

libs/backend/database/src/inputs/                   # OR wherever TeamUpdateInput lives
└── team-update.input.ts                            # MODIFIED: drop teamNumber field from TeamUpdateInput (OmitType from Team), per FR-004

docs/
└── tech-debt.md                                    # MODIFIED: delete the "Team: teamNumber auto-increment race on createTeam" entry. The race is no longer a numbering risk because the recalculate is the source of truth; the placeholder number assigned by createTeam is discarded by the next recalculate.
```

**Structure Decision**: Service + thin resolver, both co-located with the existing `team` resolver module. The mutation is exposed as a small, isolated surface with a small inline result `@ObjectType`. The advisory-lock approach avoids any schema or data migration. Legacy `_temp` rows in local/staging are corrected automatically the first time their scope is recalculated.

## Phase 0 — Research (resolved unknowns)

See [research.md](./research.md). High-level decisions:

- **Scope of one recalculate call** — `(clubId, season, type)` for `M` / `F` / `NATIONAL` and for `MX` with `nationalCountsAsMixed=false`. The pooled set `(clubId, season, MX) ∪ (clubId, season, NATIONAL)` for `MX` with `nationalCountsAsMixed=true`. Caller decides; per spec Q5.
- **Pooling shape** — NATIONAL-tier-first: NATIONAL teams take slots `1..K` (sorted by ascending `baseIndex` within NATIONAL), MX teams take slots `K+1..K+M` (sorted by ascending `baseIndex` within MX). Federation hierarchy preserved (spec Q5 → A).
- **`baseIndex` source** — base/titular members only, computed via `getIndexFromPlayers(team.type, basePlayers, system.amountOfLevels)` against the primary `RankingSystem`'s `RankingLastPlace` rows. Identical to the FE's display path and the backend enrollment validator (spec Q2 → A).
- **Tie-breaker** — Team `id` ascending (stable, opaque). Spec Q3 implicit; locked here.
- **Concurrency primitive** — `pg_advisory_xact_lock(hashtextextended('teams_renumber:' || clubId || ':' || season || ':' || scopeKey, 0))` where `scopeKey` is the single type code, OR — when pooling is in effect — a canonical pooled key (`'MX+NAT'`) so the same hash is taken by callers with `(MX, true)` and any concurrent NATIONAL-only call would collide. Auto-released on commit/rollback. No DB schema change required.
- **DB unique constraint** — explicitly NOT added. The advisory lock is the integrity boundary. Tracked as a follow-up if production data ever shows a need.
- **`_temp` cleanup** — no migration. Local/staging artifact self-heals on the next recalculate (the bulk save regenerates `name`/`abbreviation` via the model's `BeforeUpdate` hook).
- **Public mutation surface** — exactly one new mutation (`recalculateTeamNumbersForGroup`) with an inline `RecalculateTeamNumbersResult` `@ObjectType`. `updateTeam` keeps its return type `Team`; the `teamNumber` input field is removed. `createTeam` / `createTeams` / `deleteTeam` are unchanged in surface but lose every line of code that touched numbering logic outside the placeholder MAX+1 in createTeam.
- **Trigger gating** — there is no implicit trigger. The recalculate fires only when explicitly called. This is the implementation of "team numbering is frozen mid-season" (spec Q4 → D).
- **Ranking-sync interaction** — sync workers MUST NOT call the recalculate. Numbering stays frozen between explicit recalculate calls regardless of `RankingLastPlace` shifts. (Spec FR-014.)

## Phase 1 — Design & Contracts

See:

- [data-model.md](./data-model.md) — entity surface (Team, TeamPlayerMembership, Player, RankingLastPlace, RankingSystem) and the recalculate scope / invariant.
- [contracts/team-renumber-mutation.md](./contracts/team-renumber-mutation.md) — GraphQL contract for the new mutation: input shape, return type, error codes, locking semantics.
- [contracts/team-renumbering-service.md](./contracts/team-renumbering-service.md) — internal NestJS service the resolver delegates to: signature, algorithm, advisory-lock key derivation, error modes.
- [frontend-impact.md](./frontend-impact.md) — release note for the active frontend repo: explicit-call contract, when to call (after each wizard save + once per scope at end of bulk), how `nationalCountsAsMixed` is derived, deploy ordering.
- [quickstart.md](./quickstart.md) — local repro of the production bug, plus the verification steps after the fix lands.

**Agent context update**: `CLAUDE.md` symlinks to `AGENTS.md`. The plan reference between `<!-- SPECKIT START -->` / `<!-- SPECKIT END -->` markers already points at this file. (Reminder per constitution: edit `AGENTS.md`, never the symlink directly.)

## Phase 2 — Tasks (out of scope here)

`/speckit-tasks` will break down the work. Expected high-level slices, in priority order:

1. **P1 — Service + mutation**: implement `TeamRenumberingService.recalculateForScope` with advisory-lock acquire, base-roster + ranking batch fetch, baseIndex sort (with tiered pooling), and incremental save. Implement `team-renumber.resolver.ts` with authz + transaction wrapper. Define `RecalculateTeamNumbersResult` `@ObjectType`. Unit tests follow the resolver-pattern.
2. **P1 — Strip numbering writes from existing mutations**: in `updateTeam`, delete the conflict check, the shift blocks, the `_temp` suffix dance, and the `changedTeams` regeneration loop. Remove `teamNumber` from `TeamUpdateInput`. Confirm `createTeam` keeps its `nationalCountsAsMixed` MAX+1 placeholder logic untouched.
3. **P1 — Concurrency integration test**: real-DB test that fires N parallel recalculate calls against the same scope (single type, then pooled MX+NATIONAL), asserts the invariant, asserts mid-season `updateTeam` calls in parallel never write `teamNumber`.
4. **P3 — Tech-debt entry deletion**: remove the obsolete `teamNumber` race entry from `docs/tech-debt.md` (the race is no longer a numbering risk since the recalculate overwrites placeholder numbers; document this in the deletion commit).
5. **P3 — `TEAM_NUMBER_CONFLICT` deprecation**: leave the code in `ErrorCode` registry for one release; follow-up issue removes it once the active frontend's error map drops the case.
