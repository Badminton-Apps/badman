# Data Model: DataLoader for Comment.player field resolver

## No New Persistent Entities

## Shared Service: PlayerLoaderService (from feature 022)

**Location**: `libs/backend/graphql/src/loaders/player-loader.service.ts`
**Scope**: `Scope.REQUEST`

## Changed: CommentResolver.player

**File**: `libs/backend/graphql/src/resolvers/comment/comment.resolver.ts`

```typescript
// Before (line 46-49)
@ResolveField(() => Player, { nullable: true })
async player(@Parent() comment: Comment): Promise<Player> {
  return comment.getPlayer();
}

// After
@ResolveField(() => Player, { nullable: true })
async player(@Parent() comment: Comment): Promise<Player | null> {
  return this.playerLoader.load(comment.playerId);
}
```

Constructor: inject `PlayerLoaderService`.

## Related: EntryCompetitionPlayersResolver.player (bonus fix)

**File**: `libs/backend/graphql/src/resolvers/event/entry.resolver.ts` (line 190-193)

```typescript
// Current — per-row Player.findByPk
@ResolveField(() => Player)
async player(@Parent() eventEntryPlayer: EntryCompetitionPlayer): Promise<Player | null> {
  return Player.findByPk(eventEntryPlayer.id);
}

// Proposed — inject PlayerLoaderService, call loader.load(eventEntryPlayer.id)
```

Low-effort addition in the same PR if pre-condition is met. Listed here for implementer awareness; not formally in scope.

## Player N+1 Summary (all resolvers)

| Resolver | Field | Fix |
|----------|-------|-----|
| `RankingPointResolver` | `player` | Feature 022 |
| `LastRankingPlaceResolver` | `player` | Feature 023 |
| `CommentResolver` | `player` | **This feature** |
| `EntryCompetitionPlayersResolver` | `player` | Bonus in this PR or follow-up |
