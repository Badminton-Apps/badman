# Research: Atomic Team Reorder

Resolves the unknowns for `plan.md` Phase 0. Mirrors the spec's Q1–Q5 clarifications.

## R1 — Recalculate scope

**Decision**: A single recalculate call operates on either:

- A single `(clubId, season, type)` group when `type ∈ { M, F, NATIONAL }`, or when `type = MX` and `nationalCountsAsMixed = false`.
- The pooled set `(clubId, season, MX) ∪ (clubId, season, NATIONAL)` when `type = MX` and `nationalCountsAsMixed = true`.

**Rationale**: Spec Q5 → A (NATIONAL-tier-first pooling) requires the recalculate to write both tiers in one transaction when pooling is on, otherwise NATIONAL-only and MX-only calls could race and produce incompatible numberings. The pool is a real federation rule (1e/2e nationale outranks 1e liga); a club's "team 2 in mixed" must respect existing nationals.

**Alternatives considered**:

- **Per-type only, never pool** — rejected (spec Q5 → A).
- **Always pool, ignore the flag** — rejected: not all clubs want pooling; the flag exists today and drives `createTeam`. Forcing pooling everywhere would break clubs that are organized differently.
- **Two calls (one for NATIONAL, one for MX) with manual coordination** — rejected: the FE would have to serialize them itself, re-introducing the original bug class. One atomic call with one transaction and one advisory lock is correct.

**Implication**: The advisory-lock key is derived from a canonical scope key (single-type code, or the pooled-set marker `'MX+NAT'`). NATIONAL-only and MX+NATIONAL-pooled calls hash to the same lock key so they cannot run concurrently.

## R2 — Source of `baseIndex`

**Decision**: `baseIndex` is computed per team at recalculate time using `getIndexFromPlayers(team.type, basePlayers, system.amountOfLevels)` from `@badman/utils`, where `basePlayers` is the team's current `TeamPlayerMembership` rows whose `membershipType` marks them as the team's base/titular set, joined to `RankingLastPlace` rows for the primary `RankingSystem` (`primary: true`).

**Rationale**: Spec Q2 → A. Same formula and same inputs as the FE display label and the backend enrollment validator (`enrollment.service.ts:210–211`). Reusing them keeps all three views consistent.

**Alternatives considered**:

- **Persist `baseIndex` on Team** — rejected for v1: stale-by-construction (any player's ranking change would have to write back to every team that contains them); compute-on-call is acceptable at current scale (≤50 teams per pooled set, ≤4 base players each).
- **Use `teamPlayers` (everyone) instead of `basePlayers`** — rejected (spec Q2 → A).
- **Best-4 of all members** — rejected (spec Q2 → A).

## R3 — Tie-breaker

**Decision**: Within each tier (NATIONAL / MX / M / F), when two teams have the same `baseIndex`, order by `Team.id` ascending (UUID lexicographic).

**Rationale**: Stable across runs. Already a column on every team. Opaque to users (so it doesn't suggest a meaningful ranking).

**Alternatives considered**: `createdAt` — less stable in practice (imports back-date or share timestamps). `name` — circular (derived from `teamNumber`). Club name — within one scope every team shares the same club, so it never disambiguates.

## R4 — Concurrency primitive

**Decision**: `pg_advisory_xact_lock(hashtextextended('teams_renumber:' || clubId || ':' || season || ':' || scopeKey, 0))` taken as the first statement of `recalculateForScope` after the transaction is opened. `scopeKey` is `'M'`, `'F'`, `'NATIONAL'`, `'MX'`, or `'MX+NAT'`. Auto-released on `COMMIT` / `ROLLBACK`.

**Rationale**:

- Postgres advisory locks are cheap, transaction-scoped, and serialize on a key with no schema artifact.
- A NATIONAL-only call and an `MX+NAT` pooled call hash to **different** scope keys today (`'NATIONAL'` vs `'MX+NAT'`). To prevent that race, the lock key for any call that touches NATIONAL must be the same. Implementation: when `nationalCountsAsMixed = true`, use `'MX+NAT'`; when `type = NATIONAL`, *also* use `'MX+NAT'` so a NATIONAL-only call serializes against an MX-pooled call. Documented as part of R1's "canonical pooled-set marker" rule.
- Different `(clubId, season)` pairs hash to different keys → no contention.

**Alternatives considered**:

- **Add a deferrable `UNIQUE (clubId, season, type, teamNumber)` constraint** — defer to a separate hardening task; the advisory lock alone satisfies SC-003 (10 concurrent calls leave a valid state).
- **`SELECT ... FOR UPDATE` on every team in the scope** — slower for N teams, no advantage over an advisory lock that covers the whole scope as one logical resource.
- **Serializable-isolation transaction** — overkill; needs caller-side retry on serialization failure.

**Implication**: `recalculateForScope` requires the caller's transaction and runs its first statement as the advisory-lock acquire.

## R5 — DB constraint addition

**Decision**: Do NOT add a unique constraint on `(clubId, season, type, teamNumber)` in this feature.

**Rationale**: With the advisory lock, the recalculate is single-writer per scope. Adding the constraint now would require a migration plus a one-time dedupe of any existing duplicates (the existing tech-debt entry "Team: teamNumber auto-increment race on createTeam" implies we don't know whether prod has any). Tracked as a follow-up.

## R6 — `_temp` cleanup mechanism

**Decision**: No migration. No data scrub.

**Rationale**: The `_temp` artifact is residue from the broken `updateTeam` shift block, observed only in local/staging. Production has not exhibited it. The new recalculate cannot produce `_temp` (the shift block is deleted entirely from `updateTeam`). For any local/staging row that still carries the suffix, the first recalculate call against its scope rewrites `teamNumber` (or, if already correct, saves once anyway via the bulk update inside the lock) and the `BeforeUpdate` hook regenerates `name` / `abbreviation` cleanly.

**Implication**: The integration test does not need to pre-seed `_temp` rows.

## R7 — Public GraphQL surface delta

**Decision**:

1. **Add** mutation `recalculateTeamNumbersForGroup(clubId: ID!, season: Int!, type: SubEventTypeEnum!, nationalCountsAsMixed: Boolean): RecalculateTeamNumbersResult!`. `nationalCountsAsMixed` is optional; default `false`. Return type is a small inline `@ObjectType` with `teams: [Team!]!` (the affected scope's teams in final order) and `affectedScope: { clubId, season, types: [SubEventTypeEnum!]! }`.
2. **Remove** `teamNumber` from `TeamUpdateInput`. Implementation: define the input via `OmitType(Team, ['teamNumber', ...])` from `@nestjs/graphql`. Sending `teamNumber` becomes a GraphQL validation error.
3. **`updateTeam`, `createTeam`, `createTeams`, `deleteTeam`** return types unchanged. Their internal logic loses every line that touched `teamNumber` / `name` / `abbreviation`, EXCEPT `createTeam`'s `MAX(teamNumber)+1` placeholder block (which stays; the recalculate overwrites it).

**Rationale**: Adding one new mutation is the minimal surface change that satisfies "explicit call from the wizard, never a side effect". Returning the affected scope's teams in the result avoids a round-trip; including `affectedScope.types` lets the FE refetch any other view (e.g. NATIONAL list) that displays the same teams.

**Alternatives considered**:

- **Make `updateTeam` accept an opt-in `triggerRenumber: true`** (Q4 option C) — rejected (spec Q4 → D).
- **Return only `[Team]` instead of a wrapper object** — defensible, but the wrapper makes pooling explicit (caller can read `affectedScope.types`), and matches the existing `TeamResult` pattern that already wraps `[Team]`-like outputs.

## R8 — Error-code surface

**Decision**: No new error codes. The new mutation raises `PERMISSION_DENIED` (caller lacks `<clubId>_edit:club` / `edit-any:club`), `CLUB_NOT_FOUND` (clubId does not exist), `INTERNAL_ERROR` (e.g. primary `RankingSystem` missing). `TEAM_NUMBER_CONFLICT` becomes unused; left in the registry for one release.

**Rationale**: Constitution: removing a code is breaking. We don't need to remove it to ship the fix — the resolver simply stops raising it.

## R9 — Tech-debt interactions

- **Closes**: `Team: teamNumber auto-increment race on createTeam` (`docs/tech-debt.md` line 104). Strictly speaking, the race itself can still produce two teams with the same placeholder `teamNumber` after parallel `createTeam` calls — but the next recalculate overwrites both with rank-correct numbers, so the race is no longer a *numbering* risk. Document the change in semantics in the deletion commit.
- **Touches**: leading "Pillar Risks" reference in `docs/tech-debt.md` line 7. Update or remove in the same commit.
- **Unaffected**: `Team: no DB uniqueness on Teams(link, season)` (line 96). Orthogonal — that's the `(link, season)` idempotency key for `createTeam`, not numbering.

## R10 — Test strategy

**Decision**:

- **Unit tests for `TeamRenumberingService`** follow the resolver-pattern (`Test.createTestingModule`, fake `Sequelize`, `jest.spyOn` on `Team.findAll`, `RankingLastPlace.findAll`, `RankingSystem.findOne`, `Team.prototype.save`). Cases:
  - Single-type scope, group already correct → no writes.
  - Single-type scope, group wrong order → writes only the teams whose number changes.
  - Single-type scope, tie on `baseIndex` → ordered by `id` asc.
  - Single-type scope, missing rankings → uses `getIndexFromPlayers` default.
  - Empty scope → returns empty result, no writes.
  - Single team in scope → always `1`.
  - Pooled MX+NAT scope, NATIONAL teams take `1..K` and MX teams take `K+1..K+M`.
  - Pooled MX+NAT scope where a strong MX has lower `baseIndex` than the weakest NATIONAL → MX still gets a higher number (federation rule).
  - Authorization → `PERMISSION_DENIED` (or whichever error mapping the resolver picks); rollback verified.
  - Club not found → `CLUB_NOT_FOUND`; rollback verified.
  - Primary `RankingSystem` missing → `INTERNAL_ERROR`; rollback verified.
- **Updated `team.resolver.spec.ts`** asserts `updateTeam` never writes `teamNumber`/`name`/`abbreviation` (covering FR-004) and that the mutation's input shape excludes `teamNumber` (compile-time + GraphQL validation).
- **Integration test** (real test DB): seed a club with 5 single-type teams + 2 NATIONAL teams; fire 10 parallel recalculate calls (mix of single-type and pooled); assert post-state matches the federation-tiered rule, no duplicates, no `_temp`, zero `TEAM_NUMBER_CONFLICT` thrown. Also fire parallel `updateTeam` roster edits while a recalculate is in flight; assert the `updateTeam` calls do NOT write numbering.

**Rationale**: Resolver-pattern tests cover correctness in isolation; the one integration test covers the actual concurrency contract that the unit tests cannot exercise (`pg_advisory_xact_lock` is a postgres feature, not a Jest mock).
