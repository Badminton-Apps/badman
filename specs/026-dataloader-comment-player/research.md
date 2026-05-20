# Research: DataLoader for Comment.player field resolver

## Decision: Reuse PlayerLoaderService from feature 022

**Decision**: Inject the shared `PlayerLoaderService` (Scope.REQUEST) introduced by feature 022 into `CommentResolver`.

**Rationale**: `Comment.player` is identical in pattern to `RankingPoint.player` and `RankingLastPlace.player`. One shared Player DataLoader per request handles all three resolvers' batching needs — if they fire in the same request, one `Player.findAll` covers all player ids.

## Decision: EntryCompetitionPlayersResolver.player is a bonus candidate

**Decision**: Note as a related fix; not in scope for spec but mention in plan for implementer awareness.

**Rationale**: `EntryCompetitionPlayersResolver.player` at `entry.resolver.ts:190-193` calls `Player.findByPk(eventEntryPlayer.id)` per row — same N+1 pattern, same fix (inject PlayerLoaderService). Low-effort addition if pre-condition is met for comment.player.

## Pre-condition confirmed as lowest priority

Spec 019 explicitly listed Comment.player as lowest priority among opt-in candidates. Comment pages are lower traffic than ranking or encounter pages. Pre-condition (Sentry alert or hot-path test) is the correct gate.
