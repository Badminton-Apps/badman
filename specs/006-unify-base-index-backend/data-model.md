# Data Model: Unify Base-Index Calculation in the Backend

This feature introduces **no new persistent entities** and **no migrations**. It introduces (a) a backend service input/output shape and (b) GraphQL `@InputType` / `@ObjectType` declarations co-located with the new resolver. All persistent state already exists.

## Existing persistent entities consumed (read-only)

| Entity | Lib | Relevant fields | Purpose |
|--------|-----|-----------------|---------|
| `Player` | `@badman/backend-database` | `id`, `gender` | Identify base-player input; resolve gender for MX gender-split |
| `RankingPlace` | `@badman/backend-database` | `playerId`, `systemId`, `rankingDate`, `single`, `double`, `mix`, `updatePossible` | Snapshot rows used to fill missing components per FR-003/FR-004 |
| `RankingSystem` | `@badman/backend-database` | `id`, `primary`, `amountOfLevels` | Default value for missing components per FR-004 |
| `SubEventCompetition` | `@badman/backend-database` | `id`, `eventCompetitionId` | Resolves to the parent `EventCompetition` for snapshot-window inputs |
| `EventCompetition` | `@badman/backend-database` | `season`, `usedRankingUnit`, `usedRankingAmount` | Source of the snapshot date used by the canonical recalculation logic |

No table definitions change. No indices added. No migrations required.

## New (non-persistent) types

### Service-layer (internal, `libs/backend/competition/enrollment/.../index-calculation.types.ts`)

```text
IndexCalculationPlayerInput
├─ id: string                       # UUID of the player
├─ single?: number                  # Override; if absent → snapshot value, else default
├─ double?: number                  # Override; if absent → snapshot value, else default
├─ mix?: number                     # Override; if absent → snapshot value, else default
└─ gender?: "M" | "F"               # Optional; if absent and DB lookup is in scope, resolve from Player table

IndexCalculationInput
├─ key: string                      # Caller-supplied correlation key (typically the team UUID)
├─ type: SubEventTypeEnum           # M | F | MX | NATIONAL
├─ season: number                   # Season year
├─ rankingSystemId: string          # System UUID — drives snapshot row selection
├─ subEventCompetitionId?: string   # Optional; when present, the service derives season + ranking window from EventCompetition (parity with hook). When absent, the service uses (season, rankingSystemId) directly.
└─ players: IndexCalculationPlayerInput[]    # Mode is implicit:
                                              #   • All entries with single/double/mix all undefined → "base-index mode"
                                              #   • Any pre-resolved component present → "team-index mode" (same behavior; per-player override)

IndexCalculationContributingPlayer
├─ id: string
├─ gender: "M" | "F"
├─ single: number                   # After default-fill
├─ double: number                   # After default-fill
└─ mix: number                      # After default-fill (always populated; helper requires it for cross-mode invariants)

IndexCalculationSuccess
├─ key: string
├─ index: number                    # Canonical index value
├─ contributingPlayers: IndexCalculationContributingPlayer[]   # The best-N subset used in the sum
└─ missingPlayerCount: number       # 0..4 — drives the (4-n)*24 / *36 penalty already included in `index`

IndexCalculationFailure
├─ key: string
└─ error:
   ├─ code: "PLAYER_NOT_FOUND" | "RANKING_SYSTEM_NOT_FOUND"
   │       | "SUB_EVENT_NOT_FOUND" | "RANKING_FETCH_FAILED" | "INTERNAL_ERROR"
   ├─ message: string
   └─ playerIds?: string[]           # When PLAYER_NOT_FOUND, lists offending IDs

IndexCalculationResult = IndexCalculationSuccess | IndexCalculationFailure
```

Service entry points:

```text
calculate(inputs: IndexCalculationInput[], options?: { transaction?: Transaction }):
   Promise<IndexCalculationResult[]>

calculateOne(input: IndexCalculationInput, options?: { transaction?: Transaction }):
   Promise<IndexCalculationResult>      # Convenience wrapper used by the entry-model hook
```

### GraphQL surface (public, `libs/backend/graphql/.../calculate-index/`)

```text
@InputType() CalculateIndexPlayerInput
├─ id: ID!
├─ single: Int
├─ double: Int
├─ mix: Int
└─ gender: String                   # "M" | "F"; optional

@InputType() CalculateIndexInput
├─ key: ID!
├─ type: SubEventTypeEnum!
├─ season: Int!
├─ rankingSystemId: ID!
├─ subEventCompetitionId: ID
└─ players: [CalculateIndexPlayerInput!]!

@ObjectType() CalculateIndexContributingPlayer
├─ id: ID!
├─ gender: String!
├─ single: Int!
├─ double: Int!
└─ mix: Int!

@ObjectType() CalculateIndexErrorCode
   # Enum field returned as String for code-first simplicity:
   #   "PLAYER_NOT_FOUND" | "RANKING_SYSTEM_NOT_FOUND" | "SUB_EVENT_NOT_FOUND"
   #   | "RANKING_FETCH_FAILED" | "INTERNAL_ERROR"

@ObjectType() CalculateIndexError
├─ code: String!
├─ message: String!
└─ playerIds: [ID!]                 # Populated only when code == PLAYER_NOT_FOUND

@ObjectType() CalculateIndexResult
├─ key: ID!
├─ index: Int                       # Null when error is set
├─ contributingPlayers: [CalculateIndexContributingPlayer!]   # Empty when error is set
├─ missingPlayerCount: Int          # Null when error is set
└─ error: CalculateIndexError       # Null when index is set
```

Resolver:

```text
@Query(() => [CalculateIndexResult])
calculateIndex(
   @Args({ name: "inputs", type: () => [CalculateIndexInput] }) inputs: CalculateIndexInput[],
   @User() user: Player | null
): Promise<CalculateIndexResult[]>
```

## Validation rules

- `inputs` MUST be non-empty (resolver-level guard; empty list returns `BadRequestException`).
- `inputs[*].players` MAY be empty (canonical helper handles 0-player input — produces only the missing-player penalty). FR-005 is preserved.
- `inputs[*].key` MUST be unique within a single batch (resolver-level guard; duplicate keys → `BadRequestException`). This protects the FE's per-input result-mapping.
- All UUID fields MUST validate as UUIDs (existing platform `IsUUID` helper); invalid values → `BadRequestException`.
- `season` MUST be a positive integer ≤ current year + 1.

These guards are batch-fatal (`BadRequestException` returned for the whole request). They are distinct from the per-input errors of FR-002a, which describe *data* failures (player not found, snapshot unavailable) discovered while processing an otherwise valid input.

## State transitions

None. The new operation is a pure read + compute.

## Relationships

```mermaid
graph LR
   FE[New Frontend dialog] -- calculateIndex query --> R[CalculateIndexResolver]
   R -- DI --> S[IndexCalculationService]
   S -- helper --> H[getIndexFromPlayers (utils)]
   S -- read --> RP[RankingPlace]
   S -- read --> RS[RankingSystem]
   S -- read (when subEventCompetitionId) --> SE[SubEventCompetition + EventCompetition]
   Hook[EventEntry.@BeforeCreate/@BeforeUpdate] -- DI --> S
```

## Idempotency

The new operation is a **query** with no side effects, so idempotency is trivially satisfied. The Constitution's idempotency clause (Principle III) applies to create mutations and is therefore not applicable here.
