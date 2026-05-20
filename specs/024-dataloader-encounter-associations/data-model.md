# Data Model: DataLoader for EncounterCompetition associations

## No New Persistent Entities

## New Services

### TeamLoaderService

**Location**: `libs/backend/graphql/src/loaders/team-loader.service.ts`
**Scope**: `Scope.REQUEST`

```typescript
load(id: string | null | undefined): Promise<Team | null>
```

Batch fn: `Team.findAll({ where: { id: { [Op.in]: keys } } })` → `(Team | null)[]` in key order.

### DrawCompetitionLoaderService

**Location**: `libs/backend/graphql/src/loaders/draw-competition-loader.service.ts`
**Scope**: `Scope.REQUEST`

```typescript
load(id: string | null | undefined): Promise<DrawCompetition | null>
```

Batch fn: `DrawCompetition.findAll({ where: { id: { [Op.in]: keys } } })` → `(DrawCompetition | null)[]` in key order.

## Changed: EncounterCompetitionResolver

**File**: `libs/backend/graphql/src/resolvers/event/competition/encounter.resolver.ts`

| Field resolver | Before | After |
|---------------|--------|-------|
| `home` | `encounter.getHome()` | `teamLoader.load(encounter.homeTeamId)` |
| `away` | `encounter.getAway()` | `teamLoader.load(encounter.awayTeamId)` |
| `drawCompetition` | `encounter.getDrawCompetition()` | `drawLoader.load(encounter.drawId)` |

Existing try/catch retained; inner body replaced.

## N+1 Landscape in EncounterCompetitionResolver (for reference)

| Field | Current | Fix |
|-------|---------|-----|
| `home` | `getHome()` per row | **This feature** |
| `away` | `getAway()` per row | **This feature** |
| `drawCompetition` | `getDrawCompetition()` per row | **This feature** |
| `location` | `getLocation()` per row | Out of scope |
| `gameLeader` | `getGameLeader()` per row | Out of scope |
| `tempHomeCaptain` | `getTempHomeCaptain()` per row | Out of scope |
| `tempAwayCaptain` | `getTempAwayCaptain()` per row | Out of scope |
| `enteredBy` | `getEnteredBy()` per row | Out of scope |
| `acceptedBy` | `getAcceptedBy()` per row | Out of scope |
