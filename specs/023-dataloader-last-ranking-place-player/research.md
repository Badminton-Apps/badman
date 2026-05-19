# Research: DataLoader for RankingLastPlace.player field resolver

## Decision: Reuse PlayerLoaderService from feature 022

**Decision**: Inject the shared `PlayerLoaderService` (Scope.REQUEST) introduced by feature 022 into `LastRankingPlaceResolver`.

**Rationale**: `RankingPoint.player` and `RankingLastPlace.player` have identical batching needs (one Player per row, keyed by `playerId`). One shared DataLoader service per request eliminates both N+1 patterns with a single `Player.findAll` per tick — regardless of which resolver initiates the load.

**Dependency note**: If this feature is implemented before 022 merges, `PlayerLoaderService` must be created here. Recommend sequencing 022 before 023, or merging them together.

## Decision: rankingSystem field resolver is out of scope

**Decision**: Do not touch the `rankingSystem` field resolver (lines 45-51) in this feature.

**Rationale**: That resolver calls `rankingSystemService.getById(rankingPlace.systemId)` per row — the same N+1 addressed by feature 020 (RankingSystemLoaderService). Scope boundary maintained.

## Pre-condition confirmed

Implementation requires Sentry N+1 alert on `RankingLastPlace.player` OR documented hot-path test. RankingLastPlace lists can be large (all ranked players in a system), making this potentially the highest-volume Player N+1 in the schema — a strong candidate for the first pre-condition to be met.
