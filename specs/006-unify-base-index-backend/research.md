# Research: Unify Base-Index Calculation in the Backend

All Technical Context items are resolved by the spec's Clarifications block (5 Q&A on 2026-05-02) and by this document. No `NEEDS CLARIFICATION` markers remained at plan time.

## R1 — Where the new shared service lives

**Decision**: Add `IndexCalculationService` under `libs/backend/competition/enrollment/src/services/index-calculation/`. Provided and exported by `EnrollmentModule`. Consumed by (a) the new GraphQL resolver in `@badman/backend-graphql` and (b) the entry-model `BeforeCreate`/`BeforeUpdate` hook in `@badman/backend-database`.

**Rationale**:

- `EnrollmentModule` already owns `EnrollmentValidationService`, which is the heaviest existing user of the canonical helper and the snapshot-fetch pattern.
- `@badman/backend-database` cannot depend on `@badman/backend-graphql` (cycle), but it can depend on `@badman/backend-competition-enrollment`.
- Putting the service in `@badman/utils` is rejected: the service performs database I/O (RankingPlace lookup, RankingSystem lookup, SubEventCompetition lookup) and that would pollute a pure-utility lib with NestJS DI and Sequelize coupling.
- Putting the service in `@badman/backend-database` is rejected: that lib is the model layer; adding domain services there inverts dependency direction relative to current architecture.

**Alternatives considered**:

- New lib `@badman/backend-index-calculation`: rejected — overkill for a single service; nothing else needs it as a separate compilation unit; would add another `tsconfig` and `jest.config.ts` to maintain.
- Stay inline in the entry-model hook + resolver (no shared service): rejected — directly violates FR-014a (the very point of the feature).

## R2 — GraphQL operation: query vs. mutation, batched vs. single

**Decision**: A single GraphQL **query** named `calculateIndex` taking a list of `CalculateIndexInput` and returning a list of `CalculateIndexResult`. Each result carries either a successful payload or a structured per-input error (FR-002a).

**Rationale**:

- The operation reads ranking data and computes a derived value; it never writes. A query matches semantics and lets clients benefit from Apollo cache mechanisms.
- Apollo / GraphQL clients already handle list-shaped queries idiomatically; introducing a custom batching transport (e.g., DataLoader from the client) adds complexity for no benefit.
- Per-input results (vs. all-or-nothing) keep partial failures localized — exactly the UX FR-011 expects (warning icon on one team while others render).

**Alternatives considered**:

- Two separate queries (`calculateBaseIndex` + `calculateTeamIndex`): rejected — violates D3 / FR-001; reintroduces the divergence risk this feature exists to remove.
- Mutation: rejected — no writes occur; using a mutation would mislead clients about side-effects and skip query caching.
- A single (non-batched) query plus client-side batching via Apollo `BatchHttpLink`: rejected — FR-002a per-input errors are easier to model when the resolver explicitly receives the batch.

## R3 — Authorization implementation

**Decision**: The resolver method requires `@User()` to resolve to an authenticated `Player` and rejects with `UnauthorizedException` when the user is unauthenticated. No additional `hasAnyPermission` check.

**Rationale**:

- Q1 (clarification): authenticated callers only; no fine-grained gate. The dialog mounts under an already-authenticated session; no public access to ranking-derived numbers is intended.
- The platform's `PermGuard` is global and only throws on *invalid* tokens; routes are public by default. Therefore the resolver itself MUST perform the `if (!user || stub) throw new UnauthorizedException()` check, mirroring the convention in other authenticated-only resolver methods in the codebase.
- Avoiding a permission gate keeps the operation usable from any logged-in context (admin, captain, club member) without forcing the FE to know `clubId` for exploratory selection.

**Alternatives considered**:

- Per-club permission (`{clubId}_edit:enrollment-competition`): rejected — Q1; UX harm without security gain since no sensitive data is exposed beyond what authenticated users already see for those players via existing queries.
- Global `AllowAnonymous`: rejected — Q1; closes off rate-limit / abuse vectors at no cost.

## R4 — Snapshot date resolution

**Decision**: The new service reuses the exact ranking-window logic implemented in `EventEntry.recalculateCompetitionIndex` (entry.model.ts:243–264): build `usedRankingDate` from `eventCompetition.season + usedRankingUnit + usedRankingAmount`, then take the inclusive `[startRanking, endRanking]` window on that month's boundaries, filter by `updatePossible: true`, and order `rankingDate DESC` to take the most recent eligible row per player.

**Rationale**:

- FR-003 mandates parity with the canonical recalculation logic. Re-deriving the window from first principles is exactly the divergence risk we are eliminating.
- The new service must replace the inline copy in the hook (FR-014a). The cleanest way to make the hook still produce byte-identical output (SC-006) is to make the *service* contain that exact code, then delete the inline copy.

**Alternatives considered**:

- Generalizing snapshot resolution into a separate `RankingSnapshotService`: rejected — premature abstraction; today only this service needs it. Can be extracted later if a second consumer appears.

## R5 — Caching strategy implementation

**Decision**: Implement only request-scoped dedupe inside the service. For an incoming batch, group inputs by `(season, rankingSystemId)` and load `RankingPlace` rows once per group; resolve all inputs against that in-memory map. No process-wide TTL cache is shipped in v1; FR-018 *permits* it but does not require it, and the simpler implementation is enough to hit SC-003 in measurements with realistic data sizes.

**Rationale**:

- The dominant cost is the `RankingPlace.findAll` query; deduping by `(season, rankingSystem)` typically collapses a batch of N teams into one DB roundtrip.
- A process-wide cache adds invalidation surface for very small expected gain. Skipping it lowers blast radius.
- If profiling later shows the per-process cache helps, the spec already authorizes it (FR-018) with a ≤60 s TTL.

**Alternatives considered**:

- Cross-instance Redis cache: explicitly forbidden by FR-018.
- DataLoader inside the resolver: rejected — DataLoader's de-dup horizon is a single GraphQL request, which is the same as the dedupe we already do. No additional benefit.

## R6 — Hook refactor: keeping byte-identical behaviour

**Decision**: `EventEntry.recalculateCompetitionIndex` retains its `@BeforeCreate @BeforeUpdate` decorators and its `if (!instance.changed("meta")) return` short-circuit, but its body becomes a thin adapter that:

1. Builds an `IndexCalculationInput` in **team-index mode** (pre-resolved per-player components), exactly matching the data the hook already reads from `instance.meta.competition.players`.
2. Calls `IndexCalculationService.calculateOne(input, { transaction })`.
3. Writes the resulting `players` and `teamIndex` back onto `instance.meta.competition`.

The service receives the same Sequelize transaction the hook is running under (`options?.transaction`) so no isolation-level changes occur.

**Rationale**:

- Hook trigger semantics (Sequelize lifecycle, `meta`-changed gating) stay where they are — they are not part of the calculation, they are part of the model contract.
- Team-index mode (FR-001) was specifically introduced so the hook can keep passing pre-resolved per-player components and have the service fill any missing fields from the snapshot — same logic the inline code does today.
- `recalculate-entry-index` maintenance script needs no change: it triggers the hook by setting `meta` and saving (entry.model.ts:42–56 in the script), so the hook's public contract carries the behaviour through.

**Alternatives considered**:

- Make the hook call the GraphQL resolver: rejected — DB-layer code has no business going through the API surface; layering inversion.

## R7 — Type for `SubEventTypeEnum.NATIONAL`

**Decision**: The new service and resolver accept all four `SubEventTypeEnum` values (`M`, `F`, `MX`, `NATIONAL`) and route `NATIONAL` through the non-MX branch, preserving canonical helper behaviour. The helper oracle tests this explicitly.

**Rationale**:

- Existing canonical helper uses `type !== "MX"` as its branch condition. NATIONAL therefore goes through non-MX branch today and produces well-defined results.
- Locking that behaviour in the new operation prevents an accidental narrowing of the public contract.

## R8 — New-frontend integration shape (out-of-repo)

**Decision (advisory; lives in `badman-frontend`)**: The new frontend wires `calculateIndex` via Apollo Client with a single batched query per debounce window (≤300 ms, FR-009/SC-003). Inputs are keyed by team UUID so per-input errors map to the correct UI cell. While loading or pre-resolution, the field shows a spinner / dash inside an `aria-live="polite"` region (FR-010). On error, a warning icon with tooltip (FR-011).

**Rationale**: This research item is documented here for cross-repo coordination only. The `badman-frontend` plan for spec `010-fix-base-index-formula` (in that repo) supersedes any earlier local-formula plan once `calculateIndex` is available.

**Out of scope here**: implementation lives in the other repo; this repo's `tasks.md` will not include FE files. The CI grep audit (SC-002) is also a `badman-frontend` task.

## R9 — Tests structure & fixture sharing

**Decision**: Export a `INDEX_CALCULATION_FIXTURES` array from `libs/utils/src/lib/get-index.fixtures.ts` (new) consumed by:

- `get-index.spec.ts` (canonical-helper oracle — already 37 cases, will be migrated to import from the fixture file in the same PR);
- `index-calculation.service.spec.ts` (parity test layer per FR-016b);
- `calculate-index.resolver.spec.ts` (resolver-level parity per FR-016).

Each fixture entry: `{ name, type, players, defaultRanking, expected }`. Test layers iterate the same array, ensuring matrices cannot drift.

**Rationale**: FR-016b explicitly requires that adding a helper test case automatically flows through the service-level parity test. The cleanest way is one source array imported by all three layers.

**Alternatives considered**:

- Hand-mirrored test cases in each layer: rejected — exactly the drift FR-016b forbids.
