# Data Model: DataLoader for RankingPoint.player field resolver

## No New Persistent Entities

No new Sequelize models, migrations, or GraphQL types.

## New Service: PlayerLoaderService

**Location**: `libs/backend/graphql/src/loaders/player-loader.service.ts`
**Scope**: `Scope.REQUEST`

**Public API**:
```typescript
load(id: string | null | undefined): Promise<Player | null>
```

**Batch function**:
```typescript
async (keys: readonly string[]): Promise<(Player | null)[]> => {
  const players = await Player.findAll({ where: { id: { [Op.in]: keys } } });
  const map = new Map(players.map(p => [p.id, p]));
  return keys.map(id => map.get(id) ?? null);
}
```

## Changed: RankingPointResolver.player

**File**: `libs/backend/graphql/src/resolvers/ranking/rankingPoint.resolver.ts`

```typescript
// Before (line 42-44)
@ResolveField(() => Player)
async player(@Parent() rankingPoint: RankingPoint): Promise<Player> {
  return rankingPoint.getPlayer();
}

// After
@ResolveField(() => Player)
async player(@Parent() rankingPoint: RankingPoint): Promise<Player | null> {
  return this.playerLoader.load(rankingPoint.playerId);
}
```

Constructor change: inject `PlayerLoaderService` alongside existing dependencies.

## Module Wiring

`GraphqlModule` (or a new `LoadersModule` imported by `GraphqlModule`):
- Add `PlayerLoaderService` to `providers`
- Add `PlayerLoaderService` to `exports` (so 023, 026 can inject it without re-declaring)
