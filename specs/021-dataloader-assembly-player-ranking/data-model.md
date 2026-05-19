# Data Model: Eliminate conditional per-player RankingPlace fallback in assembly resolver

## No New Persistent Entities

No new Sequelize models, DB migrations, or GraphQL types. This feature modifies only the eager-load options of an existing `Player.findAll` call.

## Changed: AssemblyResolver — Player.findAll include list

**File**: `libs/backend/graphql/src/resolvers/event/competition/assembly.resolver.ts`

**titularsPlayers** (~line 38):
```typescript
// Before
const p = await Player.findAll({
  where: { id: playerIds },
  include: [RankingLastPlace],
});

// After
const p = await Player.findAll({
  where: { id: playerIds },
  include: [RankingLastPlace, RankingPlace],
});
```

**baseTeamPlayers** (~line 74):
```typescript
// Before
const basePlayers = await Player.findAll({
  where: { id: playerIds },
  include: [RankingLastPlace],
});

// After
const basePlayers = await Player.findAll({
  where: { id: playerIds },
  include: [RankingLastPlace, RankingPlace],
});
```

## Existing Associations (unchanged)

| Association | Type | Direction |
|-------------|------|-----------|
| `Player → RankingLastPlace` | hasMany | already included |
| `Player → RankingPlace` | hasMany | added by this feature |

## getCurrentRanking data flow (post-feature)

```
Player.findAll(include: [RankingLastPlace, RankingPlace])
  → player.rankingLastPlaces populated (array, possibly empty)
  → player.rankingPlaces populated (array, possibly empty)

getCurrentRanking(systemId):
  if (!this.rankingLastPlaces) → NEVER (always set by include)
  filter lastPlaces by systemId
  if (filtered.length === 0):
    → previously: getRankingPlaces() DB call per player
    → after this feature: reads this.rankingPlaces (already in memory)
  return sorted result or null
```
