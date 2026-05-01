# Data Model: Team Name/Abbreviation On-Update Regeneration

**Branch**: `003-linear-bad-127` | **Date**: 2026-04-30

## No schema changes

This fix is purely a lifecycle-hook addition. No new tables, columns, or migrations are required.

## Affected entities

### Team (existing — `libs/backend/database/src/models/team.model.ts`)

Relevant fields:

| Field | Type | Notes |
|-------|------|-------|
| `teamNumber` | `number` | Part of unique constraint `(name, clubId, teamNumber)`. Change triggers name/abbreviation regeneration. |
| `type` | `SubEventTypeEnum` | Determines gender letter via `getLetterForRegion(type, "vl")`. Change triggers regeneration. |
| `name` | `string?` | Derived. Computed from club display setting + teamNumber + regional letter. |
| `abbreviation` | `string?` | Derived. Always `${club.abbreviation} ${teamNumber}${regionalLetter}`. |
| `clubId` | `uuid?` | Used for club lookup during regeneration. Change excluded from this fix. |

### Hook lifecycle (after fix)

```
BeforeCreate         → generateName + generateAbbreviation  (unchanged)
BeforeBulkCreate     → generateName + generateAbbreviation per instance  (double-call bug fixed)
BeforeUpdate (NEW)   → if teamNumber or type changed: generateName + generateAbbreviation
BeforeBulkUpdate (NEW) → per-instance, same condition check
```

### Unique constraint implication

The compound unique index on `(name, clubId, teamNumber)` means cascade renumbering (shifting sibling teams) requires a two-phase approach:

**Phase 1** — set temp name (`_temp` suffix), `{ hooks: false }` to skip regeneration:

```
team.teamNumber = newNumber
team.name = "<prefix> <newNumber><letter>_temp"
team.save({ hooks: false })
```

**Phase 2** — final save without `hooks: false` triggers `@BeforeUpdate`:

```
team.name = undefined / stale   ← hook regenerates correct value
team.save({ transaction })      ← hook fires: generateName + generateAbbreviation
```

### Error codes (after fix)

New entry in `libs/backend/graphql/src/utils/error-codes.ts`:

| Code | Trigger | Extensions payload |
|------|---------|-------------------|
| `TEAM_NUMBER_CONFLICT` | `updateTeam` called with `teamNumber` already held by another team in same (clubId, season, type) | `{ conflictingTeamId: string }` |

## No migrations needed

Derived fields (`name`, `abbreviation`) already exist and are nullable. No column additions, renames, or index changes required.
