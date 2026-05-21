# Research: Batch Index Calculation

**Branch**: `016-batch-index-calculation` | **Date**: 2026-05-13

## R1 — Refactor pattern for `createTeams`

**Decision**: Two-phase extraction via a new private `_createTeamCore` helper.

**Rationale**: `createTeam` currently owns transaction management and index calculation. Extracting a transaction-agnostic `_createTeamCore(data, nationalCountsAsMixed, user, transaction)` lets both `createTeam` (single-team path, unchanged external contract) and `createTeams` (multi-team path, shared transaction) share the same team/player/entry creation logic without duplication. `createTeams` opens one transaction, calls `_createTeamCore` N times, batch-calculates, applies results, then commits.

**Alternatives considered**:
- *Pass precomputed results into `createTeam`*: Leaks orchestration concern into the single-team path; callers must know about batching.
- *Post-hoc update in a second transaction*: Two commits means partial state visible between them; violates atomicity.
- *`skipIndexCalc` flag on `createTeam`*: Boolean flags are a code smell; the helper extraction is cleaner and avoids N separate transactions.

---

## R2 — Single shared transaction for `createTeams`

**Decision**: `createTeams` opens one `_sequelize.transaction()`, passes it to all `_createTeamCore` calls, and commits once after all index results are applied.

**Rationale**: The current design opens N independent transactions (one per `createTeam`). Consolidating to one transaction:
1. Makes the entire `createTeams` call atomic (either all teams created or none).
2. Ensures all ranking reads in `calculate()` are consistent with the write transaction.
3. Eliminates N transaction round-trips.

**Constraint**: `_createTeamCore` must not commit or rollback — it trusts the caller to manage the transaction lifecycle.

---

## R3 — `_createTeamCore` return shape

**Decision**: Return `{ result: TeamResult, indexPayload?: IndexPayload }` where:

```typescript
interface IndexPayload {
  input: IndexCalculationInput;     // key = dbEntry.id
  entryId: string;                  // same as input.key, for fan-back
  origPlayerMap: Map<string, EntryCompetitionPlayer>; // preserve levelException fields
}
```

**Rationale**: The fan-back step needs the original player metadata (levelException, levelExceptionReason, levelExceptionRequested) which comes from the input DTO, not from the calculation result. Returning this map from `_createTeamCore` avoids re-fetching from DB.

---

## R4 — Idempotency early-return in `_createTeamCore`

**Decision**: When an existing team is found (idempotency path), `_createTeamCore` returns `{ result: { alreadyExisted: true, ... }, indexPayload: undefined }`. The caller (`createTeams`) skips this entry in the batch input list.

**Rationale**: Already-existing teams have already had their index calculated on first creation. Re-calculating would be wasteful and potentially incorrect if the ranking data has changed since first enrollment.

---

## R5 — Error mapping in `createTeams`

**Decision**: Iterate `calculate()` results; for any `isFailure(result)`, throw `GraphQLError` with the same error code mapping as the current `createTeam` code. The single shared transaction is then rolled back by the outer `catch`.

**Rationale**: Matches clarification Q1 (fail-fast). The error shape visible to callers is identical to the current per-team behavior.

---

## R6 — Test strategy for batch path

**Decision**: Add test cases to `team.resolver.spec.ts`:
1. `createTeams` with 3 teams → `IndexCalculationService.calculate` called exactly once with 3 inputs.
2. `createTeams` where one team has no entry → `calculate` called with N-1 inputs (or 0 if none have entries).
3. `createTeams` where `calculate` returns a failure for one team → entire mutation throws, transaction rolled back.
4. `createTeams` where all teams already existed → `calculate` not called at all.

Mock `IndexCalculationService` via `jest.spyOn(indexCalculationService, 'calculate')`.
