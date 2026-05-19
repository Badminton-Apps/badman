# Data Model: DataLoader for RankingLastPlace.player field resolver

## No New Persistent Entities

No new Sequelize models, migrations, or GraphQL types.

## Shared Service: PlayerLoaderService (from feature 022)

**Location**: `libs/backend/graphql/src/loaders/player-loader.service.ts`
**Scope**: `Scope.REQUEST` — one instance per request, shared across all resolvers injecting it.

## Changed: LastRankingPlaceResolver.player

**File**: `libs/backend/graphql/src/resolvers/ranking/lastRankingPlace.resolver.ts`

```typescript
// Before (line 54-56)
@ResolveField(() => Player)
async player(@Parent() rankingPlace: RankingLastPlace): Promise<Player> {
  return rankingPlace.getPlayer();
}

// After
@ResolveField(() => Player)
async player(@Parent() rankingPlace: RankingLastPlace): Promise<Player | null> {
  return this.playerLoader.load(rankingPlace.playerId);
}
```

Constructor change: inject `PlayerLoaderService` alongside existing `RankingSystemService`.

## N+1 Landscape in LastRankingPlaceResolver (for reference)

| Field | Current | Fix |
|-------|---------|-----|
| `rankingSystem` | `rankingSystemService.getById(systemId)` per row | Feature 020 (RankingSystemLoaderService) |
| `player` | `rankingPlace.getPlayer()` per row | **This feature** (PlayerLoaderService) |
