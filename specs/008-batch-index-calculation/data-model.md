# Data Model: Batch Index Calculation

**Branch**: `016-batch-index-calculation` | **Date**: 2026-05-13

> No new persistent entities. This feature is a pure refactor of the orchestration layer. The data model below documents the **internal data flow** and in-memory types introduced or affected by the refactor.

---

## Existing entities (unchanged schema)

### `Team` (`ranking` schema)
No changes to columns, associations, or validation rules.

### `EventEntry` (`event` schema)
No schema changes. The `meta.competition.teamIndex` and `meta.competition.players` fields continue to be written by the resolver after index calculation — the write now happens once per batch rather than once per team in separate transactions.

---

## In-memory types introduced by refactor

### `IndexPayload` (resolver-internal, not persisted)

Produced by `_createTeamCore`, consumed by the fan-back step in `createTeams`.

| Field | Type | Description |
|-------|------|-------------|
| `input` | `IndexCalculationInput` | Batch input for this team. `key = dbEntry.id`. |
| `entryId` | `string` | Alias for `input.key`; used for fan-back map lookup. |
| `entry` | `EventEntry` | The live Sequelize instance returned by `EventEntry.findOrCreate`. Required by `applyIndexResultToEntry` to write the result back without a second DB fetch. |
| `origPlayerMap` | `Map<string, EntryCompetitionPlayer>` | Keyed by player ID. Preserves `levelException`, `levelExceptionReason`, `levelExceptionRequested` from the incoming DTO, since those fields are not part of the calculation result. |

### `CoreTeamResult` (resolver-internal, not persisted)

Return type of `_createTeamCore`.

| Field | Type | Description |
|-------|------|-------------|
| `result` | `TeamResult` | The GraphQL return value for this team (`teamId`, `clubId`, `alreadyExisted`). |
| `indexPayload` | `IndexPayload \| undefined` | Present when the team has an entry with player metadata and needs index calculation. Absent when team has no entry, no player metadata, or team already existed (idempotency). |

---

## Data flow (sequence)

```
createTeams(data[], nationalCountsAsMixed, user)
  │
  ├─ open shared transaction T
  │
  ├─ for each team (sorted):
  │    _createTeamCore(team, nationalCountsAsMixed, user, T)
  │      ├─ idempotency check → return { result: alreadyExisted, indexPayload: undefined }
  │      ├─ Team.create + setClub + addPlayers
  │      ├─ EventEntry.findOrCreate
  │      └─ return { result, indexPayload: { input, entryId, origPlayerMap } }
  │
  ├─ collect indexPayloads[] (filter undefined)
  │
  ├─ if indexPayloads.length > 0:
  │    IndexCalculationService.calculate(indexPayloads.map(p => p.input), { transaction: T })
  │      └─ one DB pass: SubEvent + RankingSystem + Players + RankingPlaces
  │
  ├─ for each result from calculate():
  │    if isFailure → throw GraphQLError → outer catch → T.rollback()
  │    if isSuccess → lookup entry by result.key, apply teamIndex + players, entry.save(T)
  │
  ├─ T.commit()
  └─ return TeamResult[]
```

---

## Unchanged external contract

The GraphQL mutations `createTeam` and `createTeams` retain identical signatures and return types. No schema migration, no input/output type changes, no new resolvers.
