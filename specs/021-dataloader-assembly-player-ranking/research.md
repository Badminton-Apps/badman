# Research: Eliminate conditional per-player RankingPlace fallback in assembly resolver

## Decision: Eager-load RankingPlace rather than DataLoader

**Decision**: Add `{ model: RankingPlace }` to the existing `Player.findAll` `include` array.

**Rationale**: The `getCurrentRanking` method at `player.model.ts:349` checks `this.rankingLastPlaces` first. If `RankingLastPlace` is included in the `findAll`, that property is already populated and the method reads from memory. If no lastPlace matches the system, it falls through to `this.rankingPlaces` — which will also be in memory if `RankingPlace` is included. No per-player DB call occurs.

**Alternatives considered**:
- DataLoader for RankingLastPlace: rejected — already batched via `include: [RankingLastPlace]`; DataLoader would add no benefit
- DataLoader for RankingPlace: rejected — same reason; one `Player.findAll` with the include is already a single batch query
- Modify `getCurrentRanking` to accept pre-loaded data: rejected — unnecessary complexity; Sequelize's include mechanism already populates the instance properties that `getCurrentRanking` reads

## Decision: No change to getCurrentRanking logic

**Decision**: Leave `player.model.ts:getCurrentRanking` unchanged.

**Rationale**: The method already reads from `this.rankingLastPlaces` and `this.rankingPlaces` if populated. Adding the include means these properties are always set before `getCurrentRanking` is called. The fallback `getRankingPlaces()` call at line 363 becomes dead code for assembly resolver paths, without any modification.

## Association name confirmation needed

The `Player.findAll({ include: [RankingPlace] })` populates `player.rankingPlaces` (Sequelize's default pluralization of the model name). `getCurrentRanking` checks `this.rankingPlaces`. If the `Player.hasMany(RankingPlace)` association uses an alias other than `rankingPlaces`, the `include` must specify `as: '<alias>'`. **Verify during implementation** by checking the association declaration in `player.model.ts`.
