# Data Model: DataLoader for SubEvent / DrawCompetition / EventEntry parent FK associations

## No New Persistent Entities

## New Services

### EventCompetitionLoaderService

**Location**: `libs/backend/graphql/src/loaders/event-competition-loader.service.ts`
**Scope**: `Scope.REQUEST`

Batch fn: `EventCompetition.findAll({ where: { id: { [Op.in]: keys } } })` → `(EventCompetition | null)[]`

### SubEventCompetitionLoaderService

**Location**: `libs/backend/graphql/src/loaders/sub-event-competition-loader.service.ts`
**Scope**: `Scope.REQUEST`

Batch fn: `SubEventCompetition.findAll({ where: { id: { [Op.in]: keys } } })` → `(SubEventCompetition | null)[]`

## Changed Field Resolvers

| Resolver | Field | Before | After | FK used |
|----------|-------|--------|-------|---------|
| `SubEventCompetitionResolver` | `eventCompetition` | `subEvent.getEventCompetition()` | `eventCompetitionLoader.load(subEvent.eventCompetitionId)` | `eventCompetitionId` |
| `DrawCompetitionResolver` | `subEventCompetition` | `draw.getSubEventCompetition()` | `subEventLoader.load(draw.subEventCompetitionId)` | `subEventCompetitionId` |
| `EventEntryResolver` | `subEventCompetition` | `eventEntry.getSubEventCompetition()` | `subEventLoader.load(eventEntry.subEventCompetitionId)` | `subEventCompetitionId` |

## N+1 Landscape in EventEntry (for reference)

| Field | Current | Fix |
|-------|---------|-----|
| `subEventCompetition` | `getSubEventCompetition()` per row | **This feature** |
| `drawCompetition` | `getDrawCompetition()` per row | Feature 024 DrawCompetitionLoaderService (follow-up) |
| `team` | `getTeam()` per row | Out of scope |
| `players` | `getPlayers()` per row | Out of scope |
