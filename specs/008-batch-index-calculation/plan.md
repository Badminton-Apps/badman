# Implementation Plan: Batch Index Calculation in Team Creation

**Branch**: `016-batch-index-calculation` | **Date**: 2026-05-13 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/008-batch-index-calculation/spec.md`

## Summary

`createTeams` currently calls `createTeam` N times in a loop; each `createTeam` opens its own Sequelize transaction and calls `IndexCalculationService.calculateOne()`, which executes 4 DB round-trips per team. Refactor `createTeams` to a two-phase approach: (1) create all teams/entries in one shared transaction using a new private `_createTeamCore` helper, (2) call `IndexCalculationService.calculate()` once with all inputs batched, then apply results and commit.

## Technical Context

**Language/Version**: TypeScript (Node.js 20)  
**Primary Dependencies**: NestJS, Sequelize, Apollo GraphQL (`@nestjs/graphql`), `@sentry/nestjs`  
**Storage**: PostgreSQL via Sequelize (existing schemas; no migrations needed)  
**Testing**: Jest via `nx test backend-graphql`  
**Target Platform**: NestJS API server (`apps/api`)  
**Project Type**: Backend service refactor (GraphQL resolver + service layer)  
**Performance Goals**: `createTeams` with 12 teams completes in under 2 seconds end-to-end  
**Constraints**: All writes in a single Sequelize transaction; fail-fast on any index calculation failure; `calculateOne` must remain available for other callers  
**Scale/Scope**: Per-enrollment invocation; typical 4–12 teams per club per season

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code-First GraphQL via Sequelize Models | ✅ PASS | No new persistent entities. Existing `Team`, `EventEntry` models unchanged. |
| II. Translation Discipline | ✅ PASS | No i18n changes. |
| III. Transactional Mutations | ✅ PASS | Refactor consolidates N per-team transactions into one shared transaction for `createTeams`. Fail-fast + rollback preserved per clarification Q1. |
| IV. Resolver Test Discipline | ⚠️ REQUIRED | Existing tests cover `createTeam` (single). New tests required for the batch path in `createTeams`. Pattern: mock `IndexCalculationService.calculate`, verify called once with all inputs. |
| V. Legacy Frontend Boundary | ✅ PASS | Backend only. |

**Post-design re-check**: No violations. The single-transaction consolidation in `createTeams` strengthens Principle III compliance (N separate transactions replaced by one atomic operation).

## Project Structure

### Documentation (this feature)

```text
specs/008-batch-index-calculation/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit-tasks)
```

### Source Code (affected files)

```text
libs/backend/graphql/src/resolvers/team/
├── team.resolver.ts           ← primary change: _createTeamCore + refactored createTeams
└── team.resolver.spec.ts      ← new test cases for batch path

libs/backend/competition/enrollment/src/services/index-calculation/
└── index-calculation.service.ts   ← no changes; already batch-capable
```

**Structure Decision**: Pure refactor within existing file layout. No new files, no new modules, no schema changes. The `contracts/` and `quickstart.md` artifacts are omitted — this feature changes no external API surface (same GraphQL mutation signatures and return types).

## Refactoring Targets

The extraction of `_createTeamCore` is the structural anchor; the helpers below reduce duplication that would otherwise exist across the single-team and batch paths.

### `_createTeamCore(data, nationalCountsAsMixed, user, transaction)` → `CoreTeamResult`

Extract the body of `createTeam` (club lookup, permission check, idempotency, team/player/entry creation) into a private method that accepts an external transaction and returns `{ result: TeamResult, indexPayload?: IndexPayload }`. Does **not** commit or rollback.

**Effect**: `createTeam` becomes a ~10-line wrapper (open tx → call core → commit/rollback). `createTeams` can call the same core method inside a shared transaction.

---

### `indexFailureToGraphQLError(result: IndexCalculationFailure, context: { clubId, userId })` → `never`

Extract the error-code mapping chain (currently lines ~342–353 in `createTeam`) into a private method that logs + throws a `GraphQLError`. Without extraction, this block must be duplicated for the batch fan-back loop.

```typescript
// before (inline, repeated):
const code = result.error.code === "PLAYER_NOT_FOUND"
  ? ErrorCode.PLAYER_NOT_FOUND
  : ErrorCode.INTERNAL_ERROR;
throw new GraphQLError(result.error.message, { extensions: { code, ... } });

// after:
this.indexFailureToGraphQLError(result, { clubId: dbClub.id, userId });
```

---

### `applyIndexResultToEntry(entry: EventEntry, result: IndexCalculationSuccess, origPlayerMap: Map<string, EntryCompetitionPlayer>, transaction)` → `Promise<void>`

Extract the `origById` map construction + `competitionPlayers` merge + `dbEntry.save` block (currently lines ~356–379) into a private method. Called once in `createTeam`'s single path and N times in `createTeams`'s fan-back loop.

---

### `createTeams` after refactor

```typescript
async createTeams(data, nationalCountsAsMixed, user) {
  const transaction = await this._sequelize.transaction();
  try {
    const cores = await Promise.all(   // or sequential if ordering matters
      data.sort(...).map(team => this._createTeamCore(team, nationalCountsAsMixed, user, transaction))
    );
    const payloads = cores.flatMap(c => c.indexPayload ? [c.indexPayload] : []);
    if (payloads.length > 0) {
      const calcResults = await this.indexCalculationService.calculate(
        payloads.map(p => p.input), { transaction }
      );
      for (const r of calcResults) {
        if (isFailure(r)) this.indexFailureToGraphQLError(r, context);
        const payload = payloads.find(p => p.entryId === r.key)!;
        await this.applyIndexResultToEntry(payload.entry, r, payload.origPlayerMap, transaction);
      }
    }
    await transaction.commit();
    return cores.map(c => c.result);
  } catch (e) {
    await transaction.rollback();
    // re-throw as before
  }
}
```

> Note: ordering within `createTeams` (nationals before mixed) must be preserved from the current sort.

## Complexity Tracking

No constitution violations requiring justification.
